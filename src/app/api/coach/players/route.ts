import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import {
  buildAppProfileIndexes,
  buildGymSubscriptionIndexes,
  matchAppProfileToGymSubscription,
  matchGymSubscriptionToAppProfile,
  matchMemberToAppProfile,
  normalizedGymSubscriptionPhone,
  normalizedMemberPhone,
  normalizedProfilePhone,
} from "@/lib/player-matching";

const COACH_ROLES = ["manager", "admin", "head_coach", "coach"] as const;

export async function GET(request: Request) {
  const { error } = await requireAuth([...COACH_ROLES], request);
  if (error) return error;

  const supabase = createServiceClient();
  const { data: members, error: playerError } = await supabase
    .from("members")
    .select(`
      id,
      auth_id,
      full_name,
      phone,
      phone_normalized,
      status,
      goals,
      created_at
    `)
    .eq("role", "player")
    .order("created_at", { ascending: false });

  if (playerError) {
    return NextResponse.json({ success: false, error: "Failed to fetch players" }, { status: 500 });
  }

  const { data: assignments } = await supabase
    .from("member_workout_programs")
    .select("id, member_id, assigned_at, template:workout_program_templates(id, name, category)")
    .eq("status", "active");

  const assignmentsByMember = new Map(
    (assignments ?? []).map((assignment) => [assignment.member_id as string, assignment]),
  );

  const { data: appProfiles } = await supabase
    .from("member_app_profiles")
    .select("id, linked_member_id, app_user_id, full_name, phone, phone_normalized, name_normalized, height_cm, weight_kg, fitness_goal, training_level, illnesses, injuries, medical_notes, limitations, onboarding_complete, app_registered_at");

  const { data: gymSubscriptions } = await supabase
    .from("gym_subscriptions")
    .select(
      "id, member_id, member_name, phone, plan_type, start_date, end_date, status, activated_user_id, activated_at",
    );

  const profileIndexes = buildAppProfileIndexes(appProfiles ?? []);
  const activeGymSubscriptions = (gymSubscriptions ?? []).filter(isActiveGymSubscription);
  const activeGymIndexes = buildGymSubscriptionIndexes(activeGymSubscriptions);
  const allGymIndexes = buildGymSubscriptionIndexes(gymSubscriptions ?? []);

  // Deterministic activation indexes — preferred over fuzzy phone/name
  // matching whenever a row's activated_user_id is set.
  type AppProfile = NonNullable<typeof appProfiles>[number];
  type GymSubscription = NonNullable<typeof gymSubscriptions>[number];

  const profileByAppUserId = new Map<string, AppProfile>();
  for (const profile of appProfiles ?? []) {
    if (profile.app_user_id) profileByAppUserId.set(profile.app_user_id as string, profile);
  }
  const activeSubByActivatedUserId = new Map<string, GymSubscription>();
  for (const sub of activeGymSubscriptions) {
    if (sub.activated_user_id) activeSubByActivatedUserId.set(sub.activated_user_id as string, sub);
  }
  const allSubByActivatedUserId = new Map<string, GymSubscription>();
  for (const sub of gymSubscriptions ?? []) {
    if (sub.activated_user_id) allSubByActivatedUserId.set(sub.activated_user_id as string, sub);
  }

  const normalizedPhoneCounts = new Map<string, number>();
  for (const member of members ?? []) {
    const normalized = normalizedMemberPhone(member);
    if (!normalized) continue;
    normalizedPhoneCounts.set(normalized, (normalizedPhoneCounts.get(normalized) ?? 0) + 1);
  }

  const allPlayers = (members ?? []).map((member) => {
    // Prefer deterministic activation link when present.
    const activatedSub = member.auth_id ? activeSubByActivatedUserId.get(member.auth_id as string) ?? null : null;
    const activatedProfile = member.auth_id ? profileByAppUserId.get(member.auth_id as string) ?? null : null;

    const fuzzyMatch = matchMemberToAppProfile(member, profileIndexes, normalizedPhoneCounts);
    const appProfile = activatedProfile ?? fuzzyMatch.profile;
    const normalizedPhone = normalizedMemberPhone(member);
    const appPhoneNormalized = appProfile ? normalizedProfilePhone(appProfile) : "";

    const fuzzyGymMatch = appProfile ? matchAppProfileToGymSubscription(appProfile, activeGymIndexes) : null;
    const directGymSubscription = activeGymSubscriptions.find((subscription) => subscription.member_id === member.id) ?? null;
    const gymSubscription = activatedSub ?? fuzzyGymMatch?.subscription ?? directGymSubscription;
    const subscription = gymSubscription ? gymSubscriptionSummary(gymSubscription) : null;

    const hasDashboardSubscription = Boolean(gymSubscription);
    const hasAppProfile = Boolean(appProfile);
    const hasAppRegistration = Boolean(hasAppProfile && appProfile?.app_registered_at);

    // Activation link is always safe — auth.users.id is the most stable identifier we have.
    const linkedByActivation = Boolean(activatedSub);
    const safeMatch = linkedByActivation ? true : fuzzyMatch.safe;
    const matchStatus = linkedByActivation ? "activation_link" : fuzzyMatch.status;
    const matchReason = linkedByActivation
      ? "Linked deterministically via gym_subscriptions.activated_user_id."
      : fuzzyMatch.reason;
    const matchConflict = linkedByActivation ? false : fuzzyMatch.conflict || fuzzyMatch.status === "ambiguous";
    const eligible = hasDashboardSubscription && hasAppRegistration && safeMatch;

    return {
      id: member.id,
      auth_id: member.auth_id,
      phone_normalized: normalizedPhone || null,
      app_phone_normalized: appPhoneNormalized || null,
      full_name: appProfile?.full_name ?? gymSubscription?.member_name ?? member.full_name,
      phone: appProfile?.phone ?? member.phone,
      dashboard_phone: gymSubscription?.phone ?? member.phone,
      dashboard_full_name: gymSubscription?.member_name ?? member.full_name ?? null,
      app_phone: appProfile?.phone ?? null,
      status: member.status,
      goals: member.goals,
      subscription,
      app_profile: appProfile,
      has_dashboard_subscription: hasDashboardSubscription,
      has_app_profile: hasAppProfile,
      has_app_registration: hasAppRegistration,
      safe_phone_link: linkedByActivation ? true : fuzzyMatch.phoneMatch,
      safe_match: safeMatch,
      duplicate_phone: linkedByActivation ? false : fuzzyMatch.duplicatePhone,
      match_status: matchStatus,
      match_reason: matchReason,
      match_conflict: matchConflict,
      link_source: linkedByActivation ? "activation_link" : (gymSubscription ? "fuzzy" : "none"),
      activated_at: gymSubscription?.activated_at ?? null,
      eligible,
      height_cm: appProfile?.height_cm ?? null,
      weight_kg: appProfile?.weight_kg ?? null,
      fitness_goal: appProfile?.fitness_goal ?? null,
      training_level: appProfile?.training_level ?? null,
      illnesses: appProfile?.illnesses ?? [],
      injuries: appProfile?.injuries ?? [],
      medical_notes: appProfile?.medical_notes ?? null,
      limitations: appProfile?.limitations ?? null,
      onboarding_complete: appProfile?.onboarding_complete ?? false,
      app_registered_at: appProfile?.app_registered_at ?? null,
      current_assignment: assignmentsByMember.get(member.id as string) ?? null,
    };
  });

  const gymDashboardRows = (gymSubscriptions ?? []).map((subscription) => {
    // Prefer deterministic activation link.
    const activatedProfile = subscription.activated_user_id
      ? profileByAppUserId.get(subscription.activated_user_id as string) ?? null
      : null;
    const fuzzyMatch = activatedProfile ? null : matchGymSubscriptionToAppProfile(subscription, profileIndexes);
    const appProfile = activatedProfile ?? fuzzyMatch?.profile ?? null;
    const linkedByActivation = Boolean(activatedProfile);

    const normalizedPhone = normalizedGymSubscriptionPhone(subscription);
    const appPhoneNormalized = appProfile ? normalizedProfilePhone(appProfile) : "";
    return {
      id: `gym-${subscription.id}`,
      auth_id: appProfile?.app_user_id ?? subscription.activated_user_id ?? null,
      phone_normalized: normalizedPhone || null,
      app_phone_normalized: appPhoneNormalized || null,
      full_name: appProfile?.full_name ?? subscription.member_name ?? "Dashboard subscriber",
      phone: subscription.phone ?? appProfile?.phone ?? null,
      dashboard_phone: subscription.phone ?? null,
      dashboard_full_name: subscription.member_name ?? null,
      app_phone: appProfile?.phone ?? null,
      status: subscription.status ?? "unknown",
      goals: null,
      subscription: gymSubscriptionSummary(subscription),
      app_profile: appProfile,
      has_dashboard_subscription: true,
      has_app_profile: Boolean(appProfile),
      has_app_registration: Boolean(appProfile?.app_registered_at),
      safe_phone_link: linkedByActivation ? true : Boolean(fuzzyMatch?.phoneMatch),
      safe_match: linkedByActivation ? true : Boolean(fuzzyMatch?.safe),
      duplicate_phone: linkedByActivation ? false : Boolean(fuzzyMatch?.duplicatePhone),
      match_status: linkedByActivation ? "activation_link" : fuzzyMatch?.status ?? "no_match",
      match_reason: linkedByActivation
        ? "Linked deterministically via gym_subscriptions.activated_user_id."
        : fuzzyMatch?.reason ?? "No app profile linked yet.",
      match_conflict: linkedByActivation
        ? false
        : Boolean(fuzzyMatch?.conflict || fuzzyMatch?.status === "ambiguous"),
      link_source: linkedByActivation ? "activation_link" : (appProfile ? "fuzzy" : "none"),
      activated_at: subscription.activated_at ?? null,
      eligible: false,
      height_cm: appProfile?.height_cm ?? null,
      weight_kg: appProfile?.weight_kg ?? null,
      fitness_goal: appProfile?.fitness_goal ?? null,
      training_level: appProfile?.training_level ?? null,
      illnesses: appProfile?.illnesses ?? [],
      injuries: appProfile?.injuries ?? [],
      medical_notes: appProfile?.medical_notes ?? null,
      limitations: appProfile?.limitations ?? null,
      onboarding_complete: appProfile?.onboarding_complete ?? false,
      app_registered_at: appProfile?.app_registered_at ?? null,
      current_assignment: null,
    };
  });

  const appAccountRows = (appProfiles ?? []).map((profile) => {
    // Prefer deterministic activation link.
    const activatedSub = profile.app_user_id
      ? allSubByActivatedUserId.get(profile.app_user_id as string) ?? null
      : null;
    const fuzzyGymMatch = activatedSub ? null : matchAppProfileToGymSubscription(profile, allGymIndexes);
    const subscription = activatedSub ?? fuzzyGymMatch?.subscription ?? null;
    const linkedByActivation = Boolean(activatedSub);

    const appPhoneNormalized = normalizedProfilePhone(profile);
    return {
      id: `app-${profile.id}`,
      auth_id: profile.app_user_id,
      phone_normalized: subscription ? normalizedGymSubscriptionPhone(subscription) || null : null,
      app_phone_normalized: appPhoneNormalized || null,
      full_name: profile.full_name,
      phone: profile.phone,
      dashboard_phone: subscription?.phone ?? null,
      dashboard_full_name: subscription?.member_name ?? null,
      app_phone: profile.phone,
      status: subscription?.status ?? "app_only",
      goals: null,
      subscription: subscription ? gymSubscriptionSummary(subscription) : null,
      app_profile: profile,
      has_dashboard_subscription: Boolean(subscription),
      has_app_profile: true,
      has_app_registration: Boolean(profile.app_registered_at),
      safe_phone_link: linkedByActivation
        ? true
        : Boolean(subscription && normalizedGymSubscriptionPhone(subscription) && normalizedGymSubscriptionPhone(subscription) === appPhoneNormalized),
      safe_match: linkedByActivation ? true : Boolean(fuzzyGymMatch?.safe),
      duplicate_phone: false,
      match_status: linkedByActivation ? "activation_link" : fuzzyGymMatch?.status ?? "no_match",
      match_reason: linkedByActivation
        ? "Linked deterministically via gym_subscriptions.activated_user_id."
        : fuzzyGymMatch?.reason ?? "No gym subscription matched this app profile.",
      match_conflict: linkedByActivation ? false : (fuzzyGymMatch?.status === "ambiguous"),
      link_source: linkedByActivation ? "activation_link" : (subscription ? "fuzzy" : "none"),
      activated_at: subscription?.activated_at ?? null,
      eligible: false,
      height_cm: profile.height_cm ?? null,
      weight_kg: profile.weight_kg ?? null,
      fitness_goal: profile.fitness_goal ?? null,
      training_level: profile.training_level ?? null,
      illnesses: profile.illnesses ?? [],
      injuries: profile.injuries ?? [],
      medical_notes: profile.medical_notes ?? null,
      limitations: profile.limitations ?? null,
      onboarding_complete: profile.onboarding_complete ?? false,
      app_registered_at: profile.app_registered_at ?? null,
      current_assignment: assignmentsByMember.get(profile.linked_member_id as string) ?? null,
    };
  });

  const data = allPlayers.filter((player) => player.eligible);
  const identityMatchStatuses = ["activation_link", "phone", "full_name", "first_last_name"];

  // Coach dashboard card "مشتركون من الاستقبال" reads
  // diagnostics.active_dashboard_subscribed_count. Definition: any
  // non-cancelled gym_subscriptions row with workout days remaining,
  // PLUS players in `members` who are coach-assignable but don't have
  // their own gym_subscriptions row yet (deduped by member_id).
  const activeGymMemberIds = new Set<string>();
  for (const sub of activeGymSubscriptions) {
    if (sub.member_id) activeGymMemberIds.add(sub.member_id as string);
  }
  const eligiblePlayersWithoutGymRow = allPlayers.filter(
    (player) => player.eligible && !activeGymMemberIds.has(player.id as string),
  );
  const activeDashboardSubscribedCount =
    activeGymSubscriptions.length + eligiblePlayersWithoutGymRow.length;
  const diagnostics = {
    active_dashboard_subscribed_count: activeDashboardSubscribedCount,
    paid_dashboard_with_app_count: data.length,
    paid_dashboard_without_app_count: allPlayers.filter(
      (player) => player.has_dashboard_subscription && !player.eligible && !player.match_conflict,
    ).length,
    assignable_count: data.length,
  };

  const groups = {
    subscribed_in_gym_dashboard: gymDashboardRows,
    registered_in_app: appAccountRows,
    confirmed_phone_match: gymDashboardRows.filter((player) => player.has_app_registration && identityMatchStatuses.includes(player.match_status)),
    unconfirmed_phone_link: [
      ...gymDashboardRows.filter((player) => !identityMatchStatuses.includes(player.match_status)),
      ...appAccountRows.filter((player) => !identityMatchStatuses.includes(player.match_status)),
    ],
    subscribed_dashboard_and_app: data,
    subscribed_dashboard_not_app: allPlayers.filter((player) => player.has_dashboard_subscription && !player.eligible && !player.match_conflict),
    not_subscribed_in_dashboard_but_app: allPlayers.filter((player) => !player.has_dashboard_subscription && player.has_app_registration),
    duplicate_phone_needs_staff_fix: allPlayers.filter((player) => player.duplicate_phone || player.match_conflict),
    incomplete_app_profile: allPlayers.filter((player) => player.has_dashboard_subscription && player.has_app_registration && player.safe_match && !player.onboarding_complete),
    auth_account_without_app_profile: allPlayers.filter((player) => Boolean(player.auth_id) && !player.has_app_registration),
  };

  return NextResponse.json({ success: true, data, groups, all: allPlayers, diagnostics });
}

function isActiveGymSubscription(subscription: { status?: string | null; end_date?: string | null }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (subscription.status !== "active" || !subscription.end_date) return false;
  return new Date(subscription.end_date) >= today;
}

function gymSubscriptionSummary(subscription: {
  plan_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
}) {
  return {
    plan_type: subscription.plan_type ?? "unknown",
    start_date: subscription.start_date ?? "",
    end_date: subscription.end_date ?? "",
    status: subscription.status ?? "unknown",
  };
}
