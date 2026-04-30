import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Player self-signup: username + password only.
// Supabase Auth still requires an email under the hood, so we mint a
// synthetic one anchored to a fresh UUID. The user never sees it; login
// resolves it back via /api/auth/resolve.
const SYNTHETIC_EMAIL_DOMAIN = "user.oxgym.app";

const SignupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل")
    .max(40, "اسم المستخدم طويل جداً"),
  // No complexity rules. Supabase Auth still enforces its own minimum
  // length (configured in Dashboard → Authentication → Settings).
  password: z.string().min(1, "كلمة المرور مطلوبة").max(128, "كلمة المرور طويلة جداً"),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`signup:${ip}`, 5, 15 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

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

  const { username, password } = parsed.data;
  const supabase = createServiceClient();

  // Duplicate username check (case-insensitive)
  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { success: false, error: "هذا الاسم مستخدم من قبل. اختر اسماً مختلفاً." },
      { status: 409 },
    );
  }

  // Mint a UUID up-front so we control both auth.users.id and the
  // synthetic email — no two-phase create/update dance needed.
  const authId = randomUUID();
  const syntheticEmail = `${authId}@${SYNTHETIC_EMAIL_DOMAIN}`;

  const { error: authError } = await supabase.auth.admin.createUser({
    id:            authId,
    email:         syntheticEmail,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (authError) {
    return NextResponse.json(
      { success: false, error: "تعذّر إنشاء الحساب. حاول مرة أخرى." },
      { status: 400 },
    );
  }

  const { error: memberError } = await supabase.from("members").insert({
    auth_id:       authId,
    role:          "player",
    full_name:     username,         // user can rename in onboarding/profile
    username,
    status:        "active",
    temp_password: password,         // mirrored for admin visibility (per existing convention)
  });

  if (memberError) {
    // Roll back the auth user so the username isn't orphaned
    await supabase.auth.admin.deleteUser(authId);
    return NextResponse.json(
      { success: false, error: "تعذّر إنشاء الملف الشخصي" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: { user_id: authId } });
}
