import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

// POST /api/reception/delete-duplicate-member
// Body: { member_id, also_delete_auth?: boolean }
//
// Deletes the chosen members row + (optionally) its auth.users record
// if it has one. Detaches any gym_subscriptions rows that pointed at
// the member row first (sets member_id = null). Wipes child logs.
//
// Safe defaults:
//   - If the member row has an auth_id, also_delete_auth defaults to
//     true (the user's app account is deleted too).
//   - If the row is a stub (auth_id null), only the members row is
//     deleted.
// Subscriptions are never destroyed — their codes remain reclaimable.

const RECEPTION_ROLES = ["manager", "admin", "reception", "head_coach"] as const;

const BodySchema = z.object({
  member_id: z.string().uuid(),
  also_delete_auth: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const { ctx, error } = await requireAuth([...RECEPTION_ROLES], request);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const supa = createServiceClient();

  const { data: target, error: lookupErr } = await supa
    .from("members")
    .select("id, auth_id, full_name, phone, role")
    .eq("id", parsed.data.member_id)
    .maybeSingle();

  if (lookupErr || !target) {
    return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
  }
  if (target.role !== "player") {
    return NextResponse.json({ success: false, error: "Refusing to delete a staff member here" }, { status: 400 });
  }

  const memberId = target.id as string;
  const authId = target.auth_id as string | null;
  const deleteAuth = parsed.data.also_delete_auth ?? Boolean(authId);

  // 1. Free any subscription rows bound to this auth so their codes can be re-claimed
  if (authId) {
    await supa.from("gym_subscriptions")
      .update({ activated_user_id: null, activated_at: null })
      .eq("activated_user_id", authId);
  }

  // 2. Detach any subscriptions pointing at this member row
  await supa.from("gym_subscriptions").update({ member_id: null }).eq("member_id", memberId);

  // 3. Wipe child rows (workout/meal logs etc.)
  for (const tbl of [
    "workout_logs",
    "workout_exercise_logs",
    "meal_orders",
    "plan_sends",
    "notifications",
    "member_workout_programs",
    "member_meal_programs",
    "meal_consultation_requests",
  ]) {
    await supa.from(tbl).delete().eq("member_id", memberId);
  }

  // 4. Wipe app profile if present
  if (authId) {
    await supa.from("member_app_profiles").delete().eq("app_user_id", authId);
  }

  // 5. Delete the members row
  const { error: memErr } = await supa.from("members").delete().eq("id", memberId);
  if (memErr) {
    return NextResponse.json({ success: false, error: "Failed to delete member: " + memErr.message }, { status: 500 });
  }

  // 6. Optionally delete the auth user via admin API
  let authDeleted = false;
  if (authId && deleteAuth) {
    const { error: ae } = await supa.auth.admin.deleteUser(authId);
    if (!ae) authDeleted = true;
  }

  await supa.from("audit_logs").insert({
    actor_id: ctx.memberId,
    action: "reception.delete_duplicate_member",
    target_id: memberId,
    target_type: "member",
    meta: { full_name: target.full_name, phone: target.phone, auth_id: authId, auth_deleted: authDeleted },
  }).then(() => {});

  return NextResponse.json({ success: true, members_deleted: 1, auth_deleted: authDeleted });
}
