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
    .select("id, member_id, member_name, phone, plan_type, start_date, end_date, status");

  const profileIndexes = buildAppProfileIndexes(appProfiles ?? []);
  const activeGymSubscriptions = (gymSubscriptions ?? []).filter(isActiveGymSubscription);
  const activeGymIndexes = buildGymSubscriptionIndexes(activeGymSubscriptions);
  const allGymIndexes = buildGymSubscriptionIndexes(gymSubscriptions ?? []);

  const normalizedPhoneCounts = new Map<string, number>();
  for (const member of members ?? []) {
    const normalized = normalizedMemberPhone(member);
    if (!normalized) continue;
    normalizedPhoneCounts.set(normalized, (normalizedPhoneCounts.get(normalized) ?? 0) + 1);
  }

  const allPlayers = (members ?? []).map((member) => {
    const match = matchMemberToAppProfile(member, profileIndexes, normalizedPhoneCounts);
    const appProfile = match.profile;
    const normalizedPhone = normalizedMemberPhone(member);
    const appPhoneNormalized = appProfile ? normalizedProfilePhone(appProfile) : "";
    const gymMatch = appProfile ? matchAppProfileToGymSubscription(appProfile, activeGymIndexes) : null;
    const directGymSubscription = activeGymSubscriptions.find((subscription) => subscription.member_id === member.id) ?? null;
    const gymSubscription = gymMatch?.subscription ?? directGymSubscription;
    const subscription = gymSubscription ? gymSubscriptionSummary(gymSubscription) : null;
    const hasDashboardSubscription = Boolean(gymSubscription);
    const hasAppProfile = Boolean(appProfile);
    const hasAppRegistration = Boolean(hasAppProfile && appProfile?.app_registered_at);
    const safeMatch = match.safe;
    const eligible = hasDashboardSubscription && hasAppRegistration && safeMatch;

    return {
      id: member.id,
      auth_id: member.auth_id,
      phone_normalized: normalizedPhone || null,
      app_phone_normalized: appPhoneNormalized || null,
      full_name: appProfile?.full_name ?? member.full_name,
      phone: appProfile?.phone ?? member.phone,
      dashboard_phone: member.phone,
      app_phone: appProfile?.phone ?? null,
      status: member.status,
      goals: member.goals,
      subscription,
      app_profile: appProfile,
      has_dashboard_subscription: hasDashboardSubscription,
      has_app_profile: hasAppProfile,
      has_app_registration: hasAppRegistration,
      safe_phone_link: match.phoneMatch,
      safe_match: safeMatch,
      duplicate_phone: match.duplicatePhone,
      match_status: match.status,
      match_reason: match.reason,
      match_conflict: match.conflict || match.status === "ambiguous",
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
    const match = matchGymSubscriptionToAppProfile(subscription, profileIndexes);
    const appProfile = match.profile;
    const normalizedPhone = normalizedGymSubscriptionPhone(subscription);
    const appPhoneNormalized = appProfile ? normalizedProfilePhone(appProfile) : "";
    return {
      id: `gym-${subscription.id}`,
      auth_id: appProfile?.app_user_id ?? null,
      phone_normalized: normalizedPhone || null,
      app_phone_normalized: appPhoneNormalized || null,
      full_name: subscription.member_name ?? appProfile?.full_name ?? "Dashboard subscriber",
      phone: subscription.phone ?? appProfile?.phone ?? null,
      dashboard_phone: subscription.phone ?? null,
      app_phone: appProfile?.phone ?? null,
      status: subscription.status ?? "unknown",
      goals: null,
      subscription: gymSubscriptionSummary(subscription),
      app_profile: appProfile,
      has_dashboard_subscription: true,
      has_app_profile: Boolean(appProfile),
      has_app_registration: Boolean(appProfile?.app_registered_at),
      safe_phone_link: match.phoneMatch,
      safe_match: match.safe,
      duplicate_phone: match.duplicatePhone,
      match_status: match.status,
      match_reason: match.reason,
      match_conflict: match.conflict || match.status === "ambiguous",
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
    const gymMatch = matchAppProfileToGymSubscription(profile, allGymIndexes);
    const subscription = gymMatch.subscription;
    const appPhoneNormalized = normalizedProfilePhone(profile);
    return {
      id: `app-${profile.id}`,
      auth_id: profile.app_user_id,
      phone_normalized: subscription ? normalizedGymSubscriptionPhone(subscription) || null : null,
      app_phone_normalized: appPhoneNormalized || null,
      full_name: profile.full_name,
      phone: profile.phone,
      dashboard_phone: subscription?.phone ?? null,
      app_phone: profile.phone,
      status: subscription?.status ?? "app_only",
      goals: null,
      subscription: subscription ? gymSubscriptionSummary(subscription) : null,
      app_profile: profile,
      has_dashboard_subscription: Boolean(subscription),
      has_app_profile: true,
      has_app_registration: Boolean(profile.app_registered_at),
      safe_phone_link: Boolean(subscription && normalizedGymSubscriptionPhone(subscription) && normalizedGymSubscriptionPhone(subscription) === appPhoneNormalized),
      safe_match: gymMatch.safe,
      duplicate_phone: false,
      match_status: gymMatch.status,
      match_reason: gymMatch.reason,
      match_conflict: gymMatch.status === "ambiguous",
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
  const identityMatchStatuses = ["phone", "full_name", "first_last_name"];

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
