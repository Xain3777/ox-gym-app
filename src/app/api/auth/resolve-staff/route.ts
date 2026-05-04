import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { normalizePhone } from "@/lib/phone";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/auth/resolve-staff
//
// Accepts a freeform identifier (name, username, or phone) typed by a
// staff member at /staff-login and returns the auth.users email bound
// to that record so the client can call signInWithPassword.
//
// Roles considered: manager, reception, coach, head_coach. Players
// are intentionally excluded — this endpoint is the staff door.
//
// Match precedence (each step is exact / case-insensitive — never
// substring, to avoid one staff accidentally landing in another's
// session):
//   1. phone_normalized exact     (input is digits-only / phone-like)
//   2. username  ILIKE exact
//   3. full_name ILIKE exact
//
// If multiple rows match the same step, return 409 ambiguous so the
// user disambiguates instead of silently logging in as the first hit.

const Body = z.object({
  identifier: z.string().trim().min(1, "Identifier required").max(100),
});

const STAFF_ROLES = ["manager", "reception", "coach", "head_coach"] as const;

export async function POST(request: Request) {
  // Rate limit — same bucket as login, prevents enumeration.
  const ip = getClientIp(request);
  const rl = checkRateLimit(`resolve-staff:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }); }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Identifier required" }, { status: 400 });
  }

  const raw       = parsed.data.identifier.trim();
  const supabase  = createServiceClient();

  // ── 1. Phone-shaped → try phone_normalized ─────────────────────
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 7) {
    const normalized = normalizePhone(raw);
    const { data } = await supabase
      .from("members")
      .select("id, auth_id, role, full_name, phone")
      .eq("phone_normalized", normalized)
      .in("role", STAFF_ROLES);
    const match = pickSingle(data ?? []);
    if (match) return await respondForMember(supabase, match);
    if (data && data.length > 1) {
      return NextResponse.json({ success: false, error: "أكثر من حساب مطابق. تواصل مع المسؤول." }, { status: 409 });
    }
    // fall through to name lookup if no phone match
  }

  // ── 2. Username exact (CI) ─────────────────────────────────────
  {
    const { data } = await supabase
      .from("members")
      .select("id, auth_id, role, full_name, phone")
      .ilike("username", raw)
      .in("role", STAFF_ROLES);
    const match = pickSingle(data ?? []);
    if (match) return await respondForMember(supabase, match);
    if (data && data.length > 1) {
      return NextResponse.json({ success: false, error: "أكثر من حساب مطابق. استخدم رقم الهاتف." }, { status: 409 });
    }
  }

  // ── 3. Full name exact (CI) ────────────────────────────────────
  {
    const { data } = await supabase
      .from("members")
      .select("id, auth_id, role, full_name, phone")
      .ilike("full_name", raw)
      .in("role", STAFF_ROLES);
    const match = pickSingle(data ?? []);
    if (match) return await respondForMember(supabase, match);
    if (data && data.length > 1) {
      return NextResponse.json({ success: false, error: "أكثر من حساب بنفس الاسم. استخدم رقم الهاتف." }, { status: 409 });
    }
  }

  return NextResponse.json({ success: false, error: "لم يتم العثور على الحساب" }, { status: 404 });
}

// ── helpers ──────────────────────────────────────────────────────

type MemberRow = {
  id:        string;
  auth_id:   string | null;
  role:      string;
  full_name: string;
  phone:     string | null;
};

function pickSingle(rows: MemberRow[]): MemberRow | null {
  return rows.length === 1 ? rows[0] : null;
}

async function respondForMember(
  supabase: ReturnType<typeof createServiceClient>,
  member: MemberRow,
) {
  if (!member.auth_id) {
    return NextResponse.json(
      { success: false, error: "هذا الحساب لم يكتمل إعداده. شغّل seed_coaches.mjs أو تواصل مع المسؤول." },
      { status: 404 },
    );
  }

  const { data: authUser, error } = await supabase.auth.admin.getUserById(member.auth_id);
  if (error || !authUser?.user?.email) {
    return NextResponse.json(
      { success: false, error: "تعذّر استرجاع بيانات الحساب" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    email:   authUser.user.email,
    role:    member.role,
    name:    member.full_name,
  });
}
