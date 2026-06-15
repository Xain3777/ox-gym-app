import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

// POST /api/reception/lookup-code
// Body: { code: string }
// Returns the full picture of an activation code: the sub row, the
// auth user who claimed it (if any), their app profile, and their
// member record. Used by reception to investigate any code in one shot.

const RECEPTION_ROLES = ["manager", "admin", "reception", "head_coach"] as const;

const BodySchema = z.object({
  code: z.string().trim().min(2).max(40),
});

export async function POST(request: NextRequest) {
  const { error } = await requireAuth([...RECEPTION_ROLES], request);
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

  const code = parsed.data.code.toUpperCase();
  const supa = createServiceClient();

  const { data: subs } = await supa
    .from("gym_subscriptions")
    .select("id, member_id, member_name, phone, amount, currency, activation_code, activated_user_id, activated_at, cancelled_at, end_date, created_at, status")
    .eq("activation_code", code)
    .order("created_at", { ascending: false });

  if (!subs?.length) {
    return NextResponse.json({ success: true, data: { code, subs: [], claimed_by: null } });
  }

  const claimedAuth = subs.find((s) => s.activated_user_id)?.activated_user_id as string | undefined;
  let claimedBy: {
    auth_id: string;
    member_id: string | null;
    member_name: string | null;
    member_phone: string | null;
    profile_full_name: string | null;
    profile_phone: string | null;
    profile_active: boolean | null;
  } | null = null;
  if (claimedAuth) {
    const [{ data: mem }, { data: prof }] = await Promise.all([
      supa.from("members").select("id, full_name, phone").eq("auth_id", claimedAuth).maybeSingle(),
      supa.from("member_app_profiles").select("full_name, phone, active").eq("app_user_id", claimedAuth).maybeSingle(),
    ]);
    claimedBy = {
      auth_id: claimedAuth,
      member_id: (mem?.id as string) ?? null,
      member_name: (mem?.full_name as string) ?? null,
      member_phone: (mem?.phone as string) ?? null,
      profile_full_name: (prof?.full_name as string) ?? null,
      profile_phone: (prof?.phone as string) ?? null,
      profile_active: (prof?.active as boolean) ?? null,
    };
  }

  return NextResponse.json({ success: true, data: { code, subs, claimed_by: claimedBy } });
}
