import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";
import { upsertMemberAppProfile } from "@/lib/member-app-profile";

// Self-signup — code-only linking model.
//
// Signup never inspects phone or links to dashboard members. Every
// signup creates a fresh `members` row. The activation code is the
// only way an app account becomes linked to a dashboard subscription.
//
// Auth identity in Supabase Auth uses a UUID-based synthetic email
// (`{uuid}@member.oxgym.app`) so two app accounts may share a phone
// without colliding on auth.users.email. The user-typed phone goes
// into members.phone as plain contact metadata.

const SignupSchema = z.object({
  full_name: z.string().trim().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(50, "الاسم طويل جداً"),
  phone:     z.string().trim().min(7, "رقم الهاتف غير صالح").max(20, "رقم الهاتف طويل جداً"),
  password:  z.string().min(1, "كلمة المرور مطلوبة").max(128, "كلمة المرور طويلة جداً"),
});

export async function POST(request: Request) {
  // ── Rate limit ─────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = checkRateLimit(`signup:${ip}`, 5, 15 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  // ── Validate ───────────────────────────────────────────────────
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }); }

  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const { full_name, phone, password } = parsed.data;
  const phoneNormalized = normalizePhone(phone);
  if (!phoneNormalized) {
    return NextResponse.json({ success: false, error: "رقم الهاتف غير صالح" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // The name doubles as the login identifier — must be globally
  // unique (case-insensitive via idx_members_username_ci). Friendly
  // Arabic error instead of letting Postgres throw.
  const { data: usernameMatch } = await supabase
    .from("members")
    .select("id")
    .ilike("username", full_name)
    .limit(1)
    .maybeSingle();
  if (usernameMatch) {
    return NextResponse.json(
      { success: false, error: "هذا الاسم مستخدم. اختر اسماً مختلفاً." },
      { status: 409 },
    );
  }
  const username = full_name;

  // ── Create the auth user with a UUID-based synthetic email ────
  // Avoids any collision when two app accounts share a phone.
  const internalEmail = `${randomUUID()}@member.oxgym.app`;

  const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
    email:         internalEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone: phoneNormalized },
  });

  if (authError || !authResult?.user) {
    console.error("[signup] auth.admin.createUser failed:", authError);
    return NextResponse.json(
      { success: false, error: "تعذّر إنشاء الحساب. حاول مرة أخرى." },
      { status: 400 },
    );
  }

  const authId = authResult.user.id;

  // ── Always create a fresh members row ─────────────────────────
  // No phone lookup, no auto-link to dashboard. The user must enter
  // their activation code from reception to become linked to a gym
  // subscription.
  const { data: inserted, error: insErr } = await supabase
    .from("members")
    .insert({
      auth_id:  authId,
      role:     "player",
      full_name,
      phone,                  // trigger fills phone_normalized
      username,
      status:   "active",
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    console.error("[signup] members insert failed:", insErr);
    await supabase.auth.admin.deleteUser(authId);
    return NextResponse.json(
      { success: false, error: "تعذّر إنشاء الملف الشخصي." },
      { status: 500 },
    );
  }
  const memberId = inserted.id;

  const appProfile = await upsertMemberAppProfile(supabase, authId, memberId, {
    full_name,
    phone,
    onboarding_complete: false,
    illnesses: [],
    injuries: [],
  });

  return NextResponse.json({
    success: true,
    data: {
      user_id:   authId,
      member_id: memberId,
      email:     internalEmail,
      linked:    false,
      app_profile_saved: Boolean(appProfile),
      app_profile_migration_required: !appProfile,
    },
  });
}
