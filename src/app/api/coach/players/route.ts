import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { normalizePhone } from "@/lib/phone";

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
      created_at,
      subscription:member_subscriptions(plan_type, start_date, end_date, status)
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

  const memberIds = (members ?? []).map((member) => member.id as string);
  const { data: appProfiles } = memberIds.length > 0
    ? await supabase
      .from("member_app_profiles")
      .select("linked_member_id, app_user_id, full_name, phone, height_cm, weight_kg, fitness_goal, training_level, illnesses, injuries, medical_notes, limitations, onboarding_complete, app_registered_at")
      .in("linked_member_id", memberIds)
    : { data: [] };

  const profilesByMember = new Map(
    (appProfiles ?? []).map((profile) => [profile.linked_member_id as string, profile]),
  );

  const normalizedPhoneCounts = new Map<string, number>();
  for (const member of members ?? []) {
    const normalized = (member.phone_normalized as string | null) || normalizePhone((member.phone as string | null) ?? "");
    if (!normalized) continue;
    normalizedPhoneCounts.set(normalized, (normalizedPhoneCounts.get(normalized) ?? 0) + 1);
  }

  const allPlayers = (members ?? []).map((member) => {
    const subscription = pickActiveSubscription(member.subscription);
    const appProfile = profilesByMember.get(member.id as string) ?? null;
    const normalizedPhone = (member.phone_normalized as string | null) || normalizePhone((member.phone as string | null) ?? "");
    const profilePhoneNormalized = normalizePhone((appProfile?.phone as string | null) ?? "");
    const duplicatePhone = Boolean(normalizedPhone && (normalizedPhoneCounts.get(normalizedPhone) ?? 0) > 1);
    const hasDashboardSubscription = Boolean(subscription);
    const hasAppProfile = Boolean(
      member.auth_id
      && appProfile
      && appProfile.app_user_id === member.auth_id
      && appProfile.linked_member_id === member.id
    );
    const hasAppRegistration = Boolean(hasAppProfile && appProfile?.app_registered_at);
    const safePhoneLink = Boolean(
      normalizedPhone
      && !duplicatePhone
      && hasAppProfile
      && (!profilePhoneNormalized || profilePhoneNormalized === normalizedPhone)
    );
    const eligible = hasDashboardSubscription && hasAppRegistration && safePhoneLink;

    return {
      id: member.id,
      auth_id: member.auth_id,
      phone_normalized: normalizedPhone || null,
      full_name: appProfile?.full_name ?? member.full_name,
      phone: appProfile?.phone ?? member.phone,
      status: member.status,
      goals: member.goals,
      subscription,
      app_profile: appProfile,
      has_dashboard_subscription: hasDashboardSubscription,
      has_app_profile: hasAppProfile,
      has_app_registration: hasAppRegistration,
      safe_phone_link: safePhoneLink,
      duplicate_phone: duplicatePhone,
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

  const data = allPlayers.filter((player) => player.eligible);
  const groups = {
    subscribed_dashboard_and_app: data,
    subscribed_dashboard_not_app: allPlayers.filter((player) => player.has_dashboard_subscription && !player.has_app_registration),
    not_subscribed_in_dashboard_but_app: allPlayers.filter((player) => !player.has_dashboard_subscription && player.has_app_registration),
    duplicate_phone_needs_staff_fix: allPlayers.filter((player) => player.duplicate_phone),
    incomplete_app_profile: allPlayers.filter((player) => player.has_app_registration && !player.onboarding_complete),
    registered_in_app: allPlayers.filter((player) => player.has_app_registration),
    auth_account_without_app_profile: allPlayers.filter((player) => Boolean(player.auth_id) && !player.has_app_profile),
  };

  return NextResponse.json({ success: true, data, groups, all: allPlayers });
}

function pickActiveSubscription(subscription: unknown) {
  const rows = Array.isArray(subscription) ? subscription : subscription ? [subscription] : [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const active = rows.find((row) => {
    const sub = row as { status?: string; end_date?: string };
    if (sub.status !== "active" || !sub.end_date) return false;
    return new Date(sub.end_date) >= today;
  });

  return active ?? null;
}
