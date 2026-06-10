import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

// POST /api/reception/set-member-status
// Body: { member_id, status: "active" | "suspended" }
//
// Toggles members.status — used to suspend/reactivate a player
// without deleting their account or their subscription history.
// Suspended accounts stop appearing as assignable to the coach.

const RECEPTION_ROLES = ["manager", "admin", "reception", "head_coach"] as const;

const BodySchema = z.object({
  member_id: z.string().uuid(),
  status:    z.enum(["active", "suspended"]),
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
  const { member_id, status } = parsed.data;

  const { data: member, error: lookupErr } = await supa
    .from("members")
    .select("id, full_name, status, role")
    .eq("id", member_id)
    .maybeSingle();
  if (lookupErr || !member) return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
  if (member.role !== "player") return NextResponse.json({ success: false, error: "Can only suspend/activate players here" }, { status: 400 });

  const { error: updErr } = await supa.from("members").update({ status }).eq("id", member_id);
  if (updErr) return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });

  await supa.from("audit_logs").insert({
    actor_id: ctx.memberId,
    action: status === "suspended" ? "reception.suspend_member" : "reception.reactivate_member",
    target_id: member_id,
    target_type: "member",
    meta: { previous_status: member.status, new_status: status, full_name: member.full_name },
  }).then(() => {});

  return NextResponse.json({ success: true, status });
}
