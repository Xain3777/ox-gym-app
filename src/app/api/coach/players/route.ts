import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { fetchAllRows } from "@/lib/fetch-all";
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
  // NB: fetchAllRows — a plain .select() is capped at 1000 rows by
  // PostgREST. members(role=player) and gym_subscriptions both exceed
  // that, so a single query silently dropped the newest rows and made
  // recently-paid members invisible to the coach. Page past the cap.
  const { data: members, error: playerError } = await fetchAllRows<{
    id: string; auth_id: string | null; full_name: string; phone: string | null;
    phone_normalized: string | null; status: string; goals: string | null; created_at: string;
  }>(() => supabase
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
    .order("created_at", { ascending: false }));

  if (playerError) {
    return NextResponse.json({ success: false, error: "Failed to fetch players" }, { status: 500 });
  }

  const { data: assignments } = await fetchAllRows<{
    id: string; member_id: string; assigned_at: string; template: unknown;
  }>(() => supabase
    .from("member_workout_programs")
    .select("id, member_id, assigned_at, template:workout_program_templates(id, name, category)")
    .eq("status", "active"));

  const assignmentsByMember = new Map(
    (assignments ?? []).map((assignment) => [assignment.member_id as string, assignment]),
  );

  const { data: appProfiles } = await fetchAllRows<{
    id: string; linked_member_id: string | null; app_user_id: string | null;
    full_name: string | null; phone: string | null; phone_normalized: string | null;
    name_normalized: string | null; height_cm: number | null; weight_kg: number | null;
    fitness_goal: string | null; training_level: string | null; illnesses: string[] | null;
    injuries: string[] | null; medical_notes: string | null; limitations: string | null;
    onboarding_complete: boolean | null; app_registered_at: string | null;
    active: boolean | null; activation_code: string | null;
  }>(() => supabase
    .from("member_app_profiles")
    .select("id, linked_member_id, app_user_id, full_name, phone, phone_normalized, name_normalized, height_cm, weight_kg, fitness_goal, training_level, illnesses, injuries, medical_notes, limitations, onboarding_complete, app_registered_at, active, activation_code"));

  // Pull every gym_subscriptions row so cancelled ones can still be
  // counted in the raw diagnostic, then filter to non-cancelled for
  // everything that drives the player list / dashboard counts. Same
  // rule used by the dashboard cards. fetchAllRows pages past the 1000
  // cap — the whole reason recent subscribers were vanishing.
  const { data: gymSubscriptionsRaw } = await fetchAllRows<{
    id: string; member_id: string | null; member_name: string | null; phone: string | null;
    plan_type: string | null; start_date: string | null; end_date: string | null;
    status: string | null; activated_user_id: string | null; activated_at: string | null;
    activation_code: string | null; cancelled_at: string | null;
  }>(() => supabase
    .from("gym_subscriptions")
    .select(
      "id, member_id, member_name, phone, plan_type, start_date, end_date, status, activated_user_id, activated_at, activation_code, cancelled_at",
    ));
  const gymSubscriptions = (gymSubscriptionsRaw ?? []).filter((s) => s.cancelled_at == null);

  const profileIndexes = buildAppProfileIndexes(appProfiles ?? []);
  const activeGymSubscriptions = gymSubscriptions.filter(isActiveGymSubscription);
  const activeGymIndexes = buildGymSubscriptionIndexes(activeGymSubscriptions);
  const allGymIndexes = buildGymSubscriptionIndexes(gymSubscriptions);

  // Deterministic activation indexes — preferred over fuzzy phone/name
  // matching whenever a row's activated_user_id is set.
  type AppProfile = NonNullable<typeof appProfiles>[number];
  type GymSubscription = (typeof gymSubscriptions)[number];

  const profileByAppUserId = new Map<string, AppProfile>();
  for (const profile of appProfiles ?? []) {
    if (profile.app_user_id) profileByAppUserId.set(profile.app_user_id as string, profile);
  }
  const activeSubByActivatedUserId = new Map<string, GymSubscription>();
  for (const sub of activeGymSubscriptions) {
    if (sub.activated_user_id) activeSubByActivatedUserId.set(sub.activated_user_id as string, sub);
  }
  const allSubByActivatedUserId = new Map<string, GymSubscription>();
  for (const sub of gymSubscriptions) {
    if (sub.activated_user_id) allSubByActivatedUserId.set(sub.activated_user_id as string, sub);
  }

  const normalizedPhoneCounts = new Map<string, number>();
  for (const member of members ?? []) {
    const normalized = normalizedMemberPhone(member);
    if (!normalized) continue;
    normalizedPhoneCounts.set(normalized, (normalizedPhoneCounts.get(normalized) ?? 0) + 1);
  }

  // Index every non-cancelled subscription by normalized phone so the
  // intervention-reason computation below can see expired-but-bound,
  // unbound-live, and "stolen by another auth" cases for a player.
  const subsByPhone = new Map<string, GymSubscription[]>();
  for (const sub of gymSubscriptions) {
    const normalized = normalizedGymSubscriptionPhone(sub);
    if (!normalized) continue;
    const list = subsByPhone.get(normalized) ?? [];
    list.push(sub);
    subsByPhone.set(normalized, list);
  }
  const todayISO = new Date().toISOString().slice(0, 10);

  // Only iterate auth-side members. Dashboard-only stub members
  // (auth_id IS NULL) are not real users — they're the reception's
  // record of a person and are reachable through their owner's app
  // profile via activation linking. Including them produced duplicate
  // rows in the player list (e.g. once as "جوج" + once as the dashboard
  // member "جولي صقور 2").
  const membersWithAuth = (members ?? []).filter((m) => m.auth_id);

  const allPlayers = membersWithAuth.map((member) => {
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
    // Eligibility (= "coach can send plans") is activation-only.
    // The activation link (gym_subscriptions.activated_user_id =
    // member.auth_id with non-cancelled, in-date row) is the strongest
    // signal that a player paid and claimed their code. We DO NOT
    // gate on hasAppRegistration anymore — that field comes from
    // member_app_profiles which can be wiped by accidental deletes
    // (reception "delete duplicate", manual cleanups, etc.), and
    // when it's missing the player would silently vanish from the
    // coach view while still being a valid paying member. The
    // profile is treated as supplementary metadata, not as a gate.
    const eligible = linkedByActivation;

    // ── Compute the human-readable intervention reason ─────────────
    // Only meaningful for players in the needs_intervention bucket
    // (duplicate_phone || match_conflict). Computed for every player
    // so the UI can surface why each one needs reception attention.
    let interventionReason: string | null = null;
    if (!eligible) {
      const phoneSubs = normalizedPhone ? subsByPhone.get(normalizedPhone) ?? [] : [];
      const myBoundLive    = phoneSubs.find((s) => s.activated_user_id === member.auth_id && !!s.end_date && s.end_date >= todayISO);
      const myBoundExpired = phoneSubs.find((s) => s.activated_user_id === member.auth_id && !!s.end_date && s.end_date < todayISO);
      const stolenByOther  = phoneSubs.find((s) => s.activated_user_id && s.activated_user_id !== member.auth_id && !!s.end_date && s.end_date >= todayISO);
      const unboundLive    = phoneSubs.find((s) => !s.activated_user_id && !!s.end_date && s.end_date >= todayISO);

      if (!hasAppRegistration) {
        interventionReason = "لم يكمل التسجيل في التطبيق";
      } else if (myBoundExpired) {
        interventionReason = "انتهى الاشتراك — يحتاج تجديد من الاستقبال";
      } else if (stolenByOther) {
        interventionReason = "الكود مأخوذ من حساب آخر — تواصل مع الاستقبال";
      } else if (unboundLive) {
        interventionReason = "لم يدخل كود التفعيل بعد";
      } else if (phoneSubs.length === 0) {
        interventionReason = "لا يوجد اشتراك في الاستقبال — يحتاج إنشاء";
      } else if (!myBoundLive) {
        interventionReason = "حساب مكرر — يحتاج توحيد من الاستقبال";
      }
    }

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
      active: appProfile?.active ?? linkedByActivation,
      activation_code: appProfile?.activation_code ?? gymSubscription?.activation_code ?? null,
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
      intervention_reason: interventionReason,
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
      active: appProfile?.active ?? linkedByActivation,
      activation_code: appProfile?.activation_code ?? subscription.activation_code ?? null,
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
      active: profile.active ?? linkedByActivation,
      activation_code: profile.activation_code ?? subscription?.activation_code ?? null,
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

  // Coach dashboard counts — gymSubscriptions is already filtered to
  // non-cancelled at the source.
  //   A: activated      → has activated_user_id (sendable now)
  //   B: profile_no_code → no activated_user_id, but an app profile
  //                        exists for the same dashboard member_id
  //   C: dashboard_only  → no activated_user_id, no app profile
  const nonCancelledGym = gymSubscriptions;
  const profileMemberIds = new Set<string>();
  for (const profile of appProfiles ?? []) {
    if (profile.linked_member_id) profileMemberIds.add(profile.linked_member_id as string);
  }

  let aActivated = 0;
  let bProfileNoCode = 0;
  let cDashboardOnly = 0;
  for (const sub of nonCancelledGym) {
    if (sub.activated_user_id) {
      aActivated++;
    } else if (sub.member_id && profileMemberIds.has(sub.member_id as string)) {
      bProfileNoCode++;
    } else {
      cDashboardOnly++;
    }
  }

  const diagnostics = {
    total_dashboard_non_cancelled: nonCancelledGym.length,
    activated:                     aActivated,
    app_profile_no_code:           bProfileNoCode,
    dashboard_only_no_profile:     cDashboardOnly,
    // Back-compat keys for older callers — same semantics they had.
    active_dashboard_subscribed_count: nonCancelledGym.length,
    paid_dashboard_with_app_count:     aActivated,
    paid_dashboard_without_app_count:  bProfileNoCode + cDashboardOnly,
    assignable_count:                  aActivated,
  };

  // Four-group shape — replaces the 7-group fuzzy-era layout.
  // - assignable:         the only group a coach acts on (mirror of `data`)
  // - signed_up_no_code:  app accounts to nudge ("enter your code")
  // - dashboard_only:     paid gym subs with no app account yet (context only)
  // - needs_intervention: only ever non-empty if data is broken
  const groups = {
    assignable:         data,
    signed_up_no_code:  appAccountRows.filter((p) => p.has_app_registration && !p.activated_at),
    dashboard_only:     gymDashboardRows.filter((p) => !p.activated_at),
    needs_intervention: allPlayers.filter((p) => p.duplicate_phone || p.match_conflict),
  };

  return NextResponse.json({ success: true, data, groups, all: allPlayers, diagnostics });
}

function isActiveGymSubscription(subscription: { status?: string | null; end_date?: string | null; cancelled_at?: string | null }) {
  // "Valid, sendable subscription" = not cancelled AND still in-date.
  //
  // We deliberately DO NOT gate on `status === "active"`. The `status`
  // column is written by the external gym dashboard/POS and takes
  // values the app does not fully model — notably "renewed" (set on a
  // sub after the member renews) and "expired". A renewed, in-date,
  // non-cancelled row is a fully paid member the coach must be able to
  // send plans to, yet the old status check hid them the moment the
  // dashboard relabelled the row. That produced the recurring
  // "coach can't send this (paying) member a plan" bug.
  //
  // This now matches exactly what the assignment endpoints enforce
  // (/api/coach/workout-assignments + /meal-assignments): cancelled_at
  // IS NULL and end_date >= today, with no status filter. Keeping the
  // list and the assignment API in lockstep guarantees every member the
  // coach can SEE is a member the coach can actually SEND to.
  //
  // Cancellation is tracked via cancelled_at (reception's cancel path
  // sets it), so `cancelled_at IS NULL` — not the status string — is the
  // real "not cancelled" boundary.
  if (subscription.cancelled_at) return false;
  if (!subscription.end_date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
