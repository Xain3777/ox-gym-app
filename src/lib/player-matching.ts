import { normalizeMemberName } from "@/lib/identity";
import { normalizePhone } from "@/lib/phone";

export type MatchStatus =
  | "direct_link"
  | "auth_id"
  | "phone"
  | "full_name"
  | "first_last_name"
  | "ambiguous"
  | "conflict"
  | "no_match";

export type MatchableMember = {
  id: string;
  auth_id?: string | null;
  full_name?: string | null;
  phone?: string | null;
  phone_normalized?: string | null;
};

export type MatchableAppProfile = {
  id?: string | null;
  app_user_id?: string | null;
  linked_member_id?: string | null;
  full_name?: string | null;
  phone?: string | null;
  phone_normalized?: string | null;
  name_normalized?: string | null;
  app_registered_at?: string | null;
};

export type MatchableGymSubscription = {
  id: string;
  member_id?: string | null;
  member_name?: string | null;
  phone?: string | null;
};

export type PlayerMatchResult<TProfile extends MatchableAppProfile> = {
  profile: TProfile | null;
  status: MatchStatus;
  reason: string;
  safe: boolean;
  phoneMatch: boolean;
  duplicatePhone: boolean;
  conflict: boolean;
};

type ProfileIndexes<TProfile extends MatchableAppProfile> = {
  byLinkedMemberId: Map<string, TProfile[]>;
  byAppUserId: Map<string, TProfile[]>;
  byPhone: Map<string, TProfile[]>;
  byFullName: Map<string, TProfile[]>;
  byFirstLastName: Map<string, TProfile[]>;
};

type GymSubscriptionIndexes<TSubscription extends MatchableGymSubscription> = {
  byMemberId: Map<string, TSubscription[]>;
  byPhone: Map<string, TSubscription[]>;
  byFullName: Map<string, TSubscription[]>;
  byFirstLastName: Map<string, TSubscription[]>;
};

export function buildAppProfileIndexes<TProfile extends MatchableAppProfile>(
  profiles: TProfile[],
): ProfileIndexes<TProfile> {
  const indexes: ProfileIndexes<TProfile> = {
    byLinkedMemberId: new Map(),
    byAppUserId: new Map(),
    byPhone: new Map(),
    byFullName: new Map(),
    byFirstLastName: new Map(),
  };

  for (const profile of profiles) {
    add(indexes.byLinkedMemberId, profile.linked_member_id, profile);
    add(indexes.byAppUserId, profile.app_user_id, profile);
    add(indexes.byPhone, normalizedProfilePhone(profile), profile);
    add(indexes.byFullName, normalizedProfileFullName(profile), profile);
    add(indexes.byFirstLastName, firstLastNameKey(normalizedProfileFullName(profile)), profile);
  }

  return indexes;
}

export function buildGymSubscriptionIndexes<TSubscription extends MatchableGymSubscription>(
  subscriptions: TSubscription[],
): GymSubscriptionIndexes<TSubscription> {
  const indexes: GymSubscriptionIndexes<TSubscription> = {
    byMemberId: new Map(),
    byPhone: new Map(),
    byFullName: new Map(),
    byFirstLastName: new Map(),
  };

  for (const subscription of subscriptions) {
    add(indexes.byMemberId, subscription.member_id, subscription);
    add(indexes.byPhone, normalizedGymSubscriptionPhone(subscription), subscription);
    add(indexes.byFullName, normalizedGymSubscriptionFullName(subscription), subscription);
    add(indexes.byFirstLastName, firstLastNameKey(normalizedGymSubscriptionFullName(subscription)), subscription);
  }

  return indexes;
}

export function matchMemberToAppProfile<TProfile extends MatchableAppProfile>(
  member: MatchableMember,
  indexes: ProfileIndexes<TProfile>,
  memberPhoneCounts: Map<string, number>,
): PlayerMatchResult<TProfile> {
  const memberPhone = normalizedMemberPhone(member);
  const memberName = normalizedMemberFullName(member);
  const memberFirstLast = firstLastNameKey(memberName);
  const duplicateMemberPhone = Boolean(memberPhone && (memberPhoneCounts.get(memberPhone) ?? 0) > 1);

  const directProfiles = member.id ? indexes.byLinkedMemberId.get(member.id) ?? [] : [];
  const authProfiles = member.auth_id ? indexes.byAppUserId.get(member.auth_id) ?? [] : [];

  if (directProfiles.length > 1) {
    return conflict("Multiple app profiles link to this dashboard member.", duplicateMemberPhone);
  }

  if (authProfiles.length > 1) {
    return conflict("Multiple app profiles use this auth account.", duplicateMemberPhone);
  }

  const direct = directProfiles[0] ?? null;
  const auth = authProfiles[0] ?? null;

  if (direct && auth && direct !== auth) {
    return conflict("Dashboard member link and auth account point to different app profiles.", duplicateMemberPhone);
  }

  if (direct && member.auth_id && direct.app_user_id && direct.app_user_id !== member.auth_id) {
    return conflict("Linked app profile belongs to a different auth account.", duplicateMemberPhone);
  }

  if (auth && auth.linked_member_id && auth.linked_member_id !== member.id) {
    return conflict("Auth app profile links to a different dashboard member.", duplicateMemberPhone);
  }

  if (direct) {
    return safe(direct, "direct_link", "App profile linked by member_app_profiles.linked_member_id.", duplicateMemberPhone, memberPhone);
  }

  if (auth) {
    return safe(auth, "auth_id", "App profile linked by member_app_profiles.app_user_id and members.auth_id.", duplicateMemberPhone, memberPhone);
  }

  if (memberPhone) {
    const phoneProfiles = indexes.byPhone.get(memberPhone) ?? [];
    if (duplicateMemberPhone || phoneProfiles.length > 1) {
      return ambiguous("Phone match is not unique.", true);
    }
    if (phoneProfiles.length === 1) {
      return safe(phoneProfiles[0], "phone", "Unique normalized phone match.", false, memberPhone);
    }
  }

  if (memberName) {
    const nameProfiles = indexes.byFullName.get(memberName) ?? [];
    if (nameProfiles.length > 1) {
      return ambiguous("Full name match is not unique.", duplicateMemberPhone);
    }
    if (nameProfiles.length === 1) {
      return safe(nameProfiles[0], "full_name", "Unique normalized full-name match.", duplicateMemberPhone, memberPhone);
    }
  }

  if (memberFirstLast) {
    const firstLastProfiles = indexes.byFirstLastName.get(memberFirstLast) ?? [];
    if (firstLastProfiles.length > 1) {
      return ambiguous("First + last name match is not unique.", duplicateMemberPhone);
    }
    if (firstLastProfiles.length === 1) {
      return safe(firstLastProfiles[0], "first_last_name", "Unique normalized first + last name match.", duplicateMemberPhone, memberPhone);
    }
  }

  return {
    profile: null,
    status: "no_match",
    reason: "No app profile matched by direct link, auth id, phone, or normalized name.",
    safe: false,
    phoneMatch: false,
    duplicatePhone: duplicateMemberPhone,
    conflict: false,
  };
}

export function matchAppProfileToGymSubscription<TSubscription extends MatchableGymSubscription>(
  profile: MatchableAppProfile,
  indexes: GymSubscriptionIndexes<TSubscription>,
): {
  subscription: TSubscription | null;
  status: "member_id" | "phone" | "full_name" | "first_last_name" | "ambiguous" | "no_match";
  safe: boolean;
  reason: string;
} {
  const linked = unique(indexes.byMemberId.get(profile.linked_member_id ?? "") ?? []);
  if (linked.status !== "none") return subscriptionResult(linked, "member_id", "Gym subscription linked by member_id.");

  const phone = unique(indexes.byPhone.get(normalizedProfilePhone(profile)) ?? []);
  if (phone.status !== "none") return subscriptionResult(phone, "phone", "Gym subscription matched by normalized phone.");

  const fullName = unique(indexes.byFullName.get(normalizedProfileFullName(profile)) ?? []);
  if (fullName.status !== "none") return subscriptionResult(fullName, "full_name", "Gym subscription matched by normalized full name.");

  const firstLast = unique(indexes.byFirstLastName.get(firstLastNameKey(normalizedProfileFullName(profile))) ?? []);
  if (firstLast.status !== "none") return subscriptionResult(firstLast, "first_last_name", "Gym subscription matched by normalized first + last name.");

  return { subscription: null, status: "no_match", safe: false, reason: "No gym subscription matched this app profile." };
}

export function matchGymSubscriptionToAppProfile<TProfile extends MatchableAppProfile>(
  subscription: MatchableGymSubscription,
  indexes: ProfileIndexes<TProfile>,
): PlayerMatchResult<TProfile> {
  const phoneProfiles = indexes.byPhone.get(normalizedGymSubscriptionPhone(subscription)) ?? [];
  if (phoneProfiles.length === 1) {
    return safe(phoneProfiles[0], "phone", "Gym subscription matched app profile by normalized phone.", false, normalizedGymSubscriptionPhone(subscription));
  }
  if (phoneProfiles.length > 1) return ambiguous("Gym subscription phone matches multiple app profiles.", false);

  const nameProfiles = indexes.byFullName.get(normalizedGymSubscriptionFullName(subscription)) ?? [];
  if (nameProfiles.length === 1) {
    return safe(nameProfiles[0], "full_name", "Gym subscription matched app profile by normalized full name.", false, normalizedGymSubscriptionPhone(subscription));
  }
  if (nameProfiles.length > 1) return ambiguous("Gym subscription full name matches multiple app profiles.", false);

  const firstLastProfiles = indexes.byFirstLastName.get(firstLastNameKey(normalizedGymSubscriptionFullName(subscription))) ?? [];
  if (firstLastProfiles.length === 1) {
    return safe(firstLastProfiles[0], "first_last_name", "Gym subscription matched app profile by normalized first + last name.", false, normalizedGymSubscriptionPhone(subscription));
  }
  if (firstLastProfiles.length > 1) return ambiguous("Gym subscription first + last name matches multiple app profiles.", false);

  return matchMemberToAppProfile(
    {
      id: subscription.member_id || subscription.id,
      full_name: subscription.member_name,
      phone: subscription.phone,
    },
    indexes,
    new Map(),
  );
}

export function normalizedMemberPhone(member: MatchableMember): string {
  return member.phone_normalized || normalizePhone(member.phone ?? "");
}

export function normalizedProfilePhone(profile: MatchableAppProfile): string {
  return profile.phone_normalized || normalizePhone(profile.phone ?? "");
}

export function normalizedMemberFullName(member: MatchableMember): string {
  return normalizeMemberName(member.full_name ?? "");
}

export function normalizedProfileFullName(profile: MatchableAppProfile): string {
  return profile.name_normalized || normalizeMemberName(profile.full_name ?? "");
}

export function normalizedGymSubscriptionPhone(subscription: MatchableGymSubscription): string {
  return normalizePhone(subscription.phone ?? "");
}

export function normalizedGymSubscriptionFullName(subscription: MatchableGymSubscription): string {
  return normalizeMemberName(subscription.member_name ?? "");
}

function firstLastNameKey(normalizedName: string): string {
  const parts = normalizedName.split(" ").filter(Boolean);
  if (parts.length < 2) return "";
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function add<T>(map: Map<string, T[]>, key: string | null | undefined, value: T) {
  if (!key) return;
  const values = map.get(key) ?? [];
  values.push(value);
  map.set(key, values);
}

function unique<T>(values: T[]): { status: "one"; value: T } | { status: "many" | "none"; value: null } {
  if (values.length === 1) return { status: "one", value: values[0] };
  if (values.length > 1) return { status: "many", value: null };
  return { status: "none", value: null };
}

function subscriptionResult<TSubscription extends MatchableGymSubscription>(
  result: { status: "one"; value: TSubscription } | { status: "many" | "none"; value: null },
  status: "member_id" | "phone" | "full_name" | "first_last_name",
  reason: string,
) {
  if (result.status === "one") {
    return { subscription: result.value, status, safe: true, reason };
  }
  return { subscription: null, status: "ambiguous" as const, safe: false, reason: `${reason} More than one gym subscription matched.` };
}

function safe<TProfile extends MatchableAppProfile>(
  profile: TProfile,
  status: Exclude<MatchStatus, "ambiguous" | "conflict" | "no_match">,
  reason: string,
  duplicatePhone: boolean,
  memberPhone: string,
): PlayerMatchResult<TProfile> {
  return {
    profile,
    status,
    reason,
    safe: true,
    phoneMatch: Boolean(memberPhone && normalizedProfilePhone(profile) === memberPhone),
    duplicatePhone,
    conflict: false,
  };
}

function ambiguous(reason: string, duplicatePhone: boolean): PlayerMatchResult<never> {
  return {
    profile: null,
    status: "ambiguous",
    reason,
    safe: false,
    phoneMatch: false,
    duplicatePhone,
    conflict: false,
  };
}

function conflict(reason: string, duplicatePhone: boolean): PlayerMatchResult<never> {
  return {
    profile: null,
    status: "conflict",
    reason,
    safe: false,
    phoneMatch: false,
    duplicatePhone,
    conflict: true,
  };
}
