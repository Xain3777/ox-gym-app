import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

const COACH_ROLES = ["manager", "admin", "head_coach", "coach"] as const;

const AssignmentSchema = z.object({
  member_id: z.string().uuid(),
  template_id: z.string().uuid(),
  notes: z.string().max(500).optional(),
});

const UnassignSchema = z.object({
  member_id: z.string().uuid(),
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
      .select("id, auth_id, full_name, phone")
      .eq("id", member_id)
      .eq("role", "player")
      .maybeSingle(),
    supabase.from("meal_program_templates").select("id").eq("id", template_id).eq("is_active", true).maybeSingle(),
  ]);

  if (!member) return NextResponse.json({ success: false, error: "Player not found" }, { status: 404 });
  if (!template) return NextResponse.json({ success: false, error: "Meal program not found" }, { status: 404 });

  if (!member.auth_id) {
    return NextResponse.json(
      { success: false, error: "Player has no app account yet." },
      { status: 403 },
    );
  }

  // Eligibility: must be activated + have a current (non-cancelled, non-expired) subscription.
  const [{ data: appProfile }, { data: activatedSub }] = await Promise.all([
    supabase
      .from("member_app_profiles")
      .select("id, app_registered_at")
      .eq("app_user_id", member.auth_id)
      .maybeSingle(),
    supabase
      .from("gym_subscriptions")
      .select("id, end_date, cancelled_at")
      .eq("activated_user_id", member.auth_id)
      .is("cancelled_at", null)
      .gte("end_date", new Date().toISOString().slice(0, 10))
      .order("end_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!appProfile?.app_registered_at) {
    return NextResponse.json(
      { success: false, error: "Player must register in the Web App before assignment." },
      { status: 403 },
    );
  }

  if (!activatedSub) {
    return NextResponse.json(
      { success: false, error: "Player has no active activated subscription." },
      { status: 403 },
    );
  }

  // Supersede previous active assignment.
  const { data: replacedRows } = await supabase
    .from("member_meal_programs")
    .update({ status: "replaced" })
    .eq("member_id", member_id)
    .eq("status", "active")
    .select("id");

  const { data, error: insertError } = await supabase
    .from("member_meal_programs")
    .insert({
      member_id,
      template_id,
      status: "active",
      notes: notes ?? null,
    })
    .select("id")
    .single();

  if (insertError || !data) {
    if (replacedRows?.length) {
      await supabase
        .from("member_meal_programs")
        .update({ status: "active" })
        .in("id", replacedRows.map((row) => row.id));
    }
    return NextResponse.json({ success: false, error: "Failed to assign meal program" }, { status: 500 });
  }

  // Mirror to plan_sends so the existing portal home `hasMealPlan` flag keeps working.
  await supabase.from("plan_sends").insert({
    member_id,
    plan_id: template_id,
    plan_type: "meal",
    sent_by: ctx.memberId,
    status: "sent",
  });

  return NextResponse.json({ success: true, data });
}

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
    .from("member_meal_programs")
    .update({ status: "replaced" })
    .eq("member_id", parsed.data.member_id)
    .eq("status", "active")
    .select("id");

  if (updErr) {
    return NextResponse.json({ success: false, error: "Failed to unassign meal program" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { cleared: cleared?.length ?? 0 } });
}
