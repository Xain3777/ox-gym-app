import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { normalizePhone } from "@/lib/phone";

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
      .select("id, auth_id, phone, phone_normalized, subscription:member_subscriptions(plan_type, start_date, end_date, status)")
      .eq("id", member_id)
      .eq("role", "player")
      .maybeSingle(),
    supabase.from("workout_program_templates").select("id").eq("id", template_id).eq("is_active", true).maybeSingle(),
  ]);

  if (!member) return NextResponse.json({ success: false, error: "Player not found" }, { status: 404 });
  if (!template) return NextResponse.json({ success: false, error: "Program not found" }, { status: 404 });

  const normalizedPhone = (member.phone_normalized as string | null) || normalizePhone((member.phone as string | null) ?? "");
  if (!normalizedPhone) {
    return NextResponse.json(
      { success: false, error: "Player must have a valid normalized phone before assignment." },
      { status: 403 },
    );
  }

  const { data: phoneMatches } = await supabase
    .from("members")
    .select("id")
    .eq("role", "player")
    .eq("phone_normalized", normalizedPhone)
    .limit(2);

  if ((phoneMatches?.length ?? 0) > 1) {
    return NextResponse.json(
      { success: false, error: "Duplicate phone number found, staff must fix" },
      { status: 403 },
    );
  }

  const subscription = pickActiveSubscription(member.subscription);
  if (!member.auth_id || !subscription) {
    return NextResponse.json(
      { success: false, error: "Player must be subscribed and linked to the Web App before assignment." },
      { status: 403 },
    );
  }

  const { data: appProfile } = await supabase
    .from("member_app_profiles")
    .select("id, phone, app_registered_at")
    .eq("linked_member_id", member_id)
    .eq("app_user_id", member.auth_id)
    .maybeSingle();

  if (!appProfile) {
    return NextResponse.json(
      { success: false, error: "Player has not completed Web App profile linking." },
      { status: 403 },
    );
  }

  if (!appProfile.app_registered_at) {
    return NextResponse.json(
      { success: false, error: "Player must register in the Web App before assignment." },
      { status: 403 },
    );
  }

  const profilePhoneNormalized = normalizePhone((appProfile.phone as string | null) ?? "");
  if (profilePhoneNormalized && profilePhoneNormalized !== normalizedPhone) {
    return NextResponse.json(
      { success: false, error: "Player app profile phone does not match dashboard phone." },
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

function pickActiveSubscription(subscription: unknown) {
  const rows = Array.isArray(subscription) ? subscription : subscription ? [subscription] : [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return rows.find((row) => {
    const sub = row as { status?: string; end_date?: string };
    if (sub.status !== "active" || !sub.end_date) return false;
    return new Date(sub.end_date) >= today;
  }) ?? null;
}
