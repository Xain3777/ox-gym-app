import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

// POST /api/reception/reset-password
// Body: { member_id, temp_password?: string }
//
// Sets a temporary password on a player's auth account so reception
// can help someone who forgot theirs. Returns the temp password so
// reception can read it back to the member at the desk. The member
// can then log in and change it from their settings.

const RECEPTION_ROLES = ["manager", "admin", "reception", "head_coach"] as const;

const BodySchema = z.object({
  member_id:     z.string().uuid(),
  temp_password: z.string().min(6).max(72).optional(),
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
  const { data: member } = await supa
    .from("members")
    .select("id, auth_id, full_name, role")
    .eq("id", parsed.data.member_id)
    .maybeSingle();
  if (!member?.auth_id) return NextResponse.json({ success: false, error: "Member has no app account" }, { status: 404 });
  if (member.role !== "player") return NextResponse.json({ success: false, error: "Refusing to reset password for a staff member here" }, { status: 400 });

  // Default password is a fixed, easy-to-tell-the-member value.
  // Reception can override with temp_password in the body if they
  // want something custom for a specific case.
  const tempPassword = parsed.data.temp_password ?? "ox2026";

  const { error: ae } = await supa.auth.admin.updateUserById(member.auth_id, { password: tempPassword });
  if (ae) return NextResponse.json({ success: false, error: ae.message }, { status: 500 });

  await supa.from("audit_logs").insert({
    actor_id: ctx.memberId,
    action: "reception.reset_password",
    target_id: parsed.data.member_id,
    target_type: "member",
    meta: { full_name: member.full_name },
  }).then(() => {});

  return NextResponse.json({ success: true, temp_password: tempPassword });
}
