import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import {
  buildAppProfileIndexes,
  buildGymSubscriptionIndexes,
  matchAppProfileToGymSubscription,
  matchMemberToAppProfile,
  normalizedMemberPhone,
} from "@/lib/player-matching";

const COACH_ROLES = ["manager", "admin", "head_coach", "coach"] as const;

const AssignmentSchema = z.object({
  member_id: z.string().uuid(),
  template_id: z.string().uuid(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const { ctx, error } = await requireAuth([...COACH_ROLES], request);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = AssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { member_id, template_id, notes } = parsed.data;

  const [{ data: member }, { data: template }] = await Promise.all([
    supabase
      .from("members")
      .select("id, auth_id, full_name, phone, phone_normalized")
      .eq("id", member_id)
      .eq("role", "player")
      .maybeSingle(),
    supabase.from("workout_program_templates").select("id").eq("id", template_id).eq("is_active", true).maybeSingle(),
  ]);

  if (!member) return NextResponse.json({ success: false, error: "Player not found" }, { status: 404 });
  if (!template) return NextResponse.json({ success: false, error: "Program not found" }, { status: 404 });

  const [{ data: allPlayers }, { data: appProfiles }, { data: gymSubscriptions }] = await Promise.all([
    supabase
      .from("members")
      .select("id, phone, phone_normalized")
      .eq("role", "player"),
    supabase
      .from("member_app_profiles")
      .select("id, linked_member_id, app_user_id, full_name, phone, phone_normalized, name_normalized, app_registered_at"),
    supabase
      .from("gym_subscriptions")
      .select("id, member_id, member_name, phone, plan_type, start_date, end_date, status"),
  ]);

  const normalizedPhoneCounts = new Map<string, number>();
  for (const player of allPlayers ?? []) {
    const normalized = normalizedMemberPhone(player);
    if (!normalized) continue;
    normalizedPhoneCounts.set(normalized, (normalizedPhoneCounts.get(normalized) ?? 0) + 1);
  }

  const profileIndexes = buildAppProfileIndexes(appProfiles ?? []);
  const match = matchMemberToAppProfile(member, profileIndexes, normalizedPhoneCounts);

  if (!match.safe || !match.profile) {
    return NextResponse.json(
      { success: false, error: `Player is not safely linked to an App profile. ${match.reason}` },
      { status: 403 },
    );
  }

  if (!match.profile.app_registered_at) {
    return NextResponse.json(
      { success: false, error: "Player must register in the Web App before assignment." },
      { status: 403 },
    );
  }

  const activeGymSubscriptions = (gymSubscriptions ?? []).filter(isActiveGymSubscription);
  const gymIndexes = buildGymSubscriptionIndexes(activeGymSubscriptions);
  const gymMatch = matchAppProfileToGymSubscription(match.profile, gymIndexes);

  if (!gymMatch.safe || !gymMatch.subscription) {
    return NextResponse.json(
      { success: false, error: `Player must have an active Dashboard subscription in gym_subscriptions before assignment. ${gymMatch.reason}` },
      { status: 403 },
    );
  }

  const { data: replacedRows } = await supabase
    .from("member_workout_programs")
    .update({ status: "replaced" })
    .eq("member_id", member_id)
    .eq("status", "active")
    .select("id");

  const { data, error: insertError } = await supabase
    .from("member_workout_programs")
    .insert({
      member_id,
      template_id,
      assigned_by: ctx.memberId,
      status: "active",
      notes: notes ?? null,
    })
    .select("id")
    .single();

  if (insertError || !data) {
    if (replacedRows?.length) {
      await supabase
        .from("member_workout_programs")
        .update({ status: "active" })
        .in("id", replacedRows.map((row) => row.id));
    }
    return NextResponse.json({ success: false, error: "Failed to assign program" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

// DELETE: unassign the player's currently-active workout program. Marks
// every active row for the member as `replaced` (same status the POST
// path uses when superseding an old assignment) so we keep the history
// and match the existing schema's permitted status values. Player's
// /portal/workouts query (WHERE status='active') stops surfacing it.
const UnassignSchema = z.object({
  member_id: z.string().uuid(),
});

export async function DELETE(request: NextRequest) {
  const { error } = await requireAuth([...COACH_ROLES], request);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = UnassignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: cleared, error: updErr } = await supabase
    .from("member_workout_programs")
    .update({ status: "replaced" })
    .eq("member_id", parsed.data.member_id)
    .eq("status", "active")
    .select("id");

  if (updErr) {
    return NextResponse.json({ success: false, error: "Failed to unassign program" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { cleared: cleared?.length ?? 0 } });
}

function isActiveGymSubscription(subscription: { status?: string | null; end_date?: string | null }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (subscription.status !== "active" || !subscription.end_date) return false;
  return new Date(subscription.end_date) >= today;
}
