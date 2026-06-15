import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

// POST /api/reception/update-member
// Body: { member_id, full_name?, phone? }
//
// Corrects typos in name or phone. Also keeps phone_normalized in sync
// (handles Arabic-Indic digits + leading 0 → 963 prefix). If the auth
// account exists, the auth email is NOT changed (login still works via
// phone or username via /staff-login or via the auth email which is a
// stable internal id — changing it is not safe).
//
// For phone changes, we ALSO update member_app_profiles.phone so the
// coach API's normalized-phone joins line up.

const RECEPTION_ROLES = ["manager", "admin", "reception", "head_coach"] as const;

const BodySchema = z.object({
  member_id: z.string().uuid(),
  full_name: z.string().trim().min(1).max(200).optional(),
  phone:     z.string().trim().min(1).max(40).optional(),
}).refine((d) => d.full_name !== undefined || d.phone !== undefined, {
  message: "Provide at least one of full_name or phone",
});

function normalizePhone(raw: string): string {
  const w = raw.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const digits = w.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("963")) return digits;
  if (digits.startsWith("0"))   return "963" + digits.slice(1);
  return digits;
}

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
    .select("id, auth_id, full_name, phone, role")
    .eq("id", parsed.data.member_id)
    .maybeSingle();
  if (!member) return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });

  const update: Record<string, string> = {};
  if (parsed.data.full_name) update.full_name = parsed.data.full_name;
  if (parsed.data.phone) {
    update.phone = parsed.data.phone;
    const pn = normalizePhone(parsed.data.phone);
    if (pn) update.phone_normalized = pn;
  }

  const { error: updErr } = await supa.from("members").update(update).eq("id", member.id);
  if (updErr) return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });

  // Mirror phone changes onto the linked app profile so coach's phone joins still work
  if (member.auth_id && (parsed.data.phone || parsed.data.full_name)) {
    const profUpdate: Record<string, string> = {};
    if (parsed.data.full_name) profUpdate.full_name = parsed.data.full_name;
    if (parsed.data.phone) {
      profUpdate.phone = parsed.data.phone;
      const pn = normalizePhone(parsed.data.phone);
      if (pn) profUpdate.phone_normalized = pn;
    }
    await supa.from("member_app_profiles").update(profUpdate).eq("app_user_id", member.auth_id);
  }

  await supa.from("audit_logs").insert({
    actor_id: ctx.memberId,
    action: "reception.update_member",
    target_id: member.id,
    target_type: "member",
    meta: { from: { full_name: member.full_name, phone: member.phone }, to: update },
  }).then(() => {});

  return NextResponse.json({ success: true, applied: update });
}
