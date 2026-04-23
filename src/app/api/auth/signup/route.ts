import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { normalizePhone, phoneToEmail } from "@/lib/phone";

const SignupSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username too long")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  phone: z
    .string()
    .min(7, "Phone number too short")
    .max(20, "Phone number too long")
    .regex(/^\+?[\d\s\-()]+$/, "Invalid phone number format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
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

  const result = SignupSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const { username, phone, password } = result.data;
  const normalizedPhone = normalizePhone(phone);
  const generatedEmail  = phoneToEmail(phone);

  const supabase = createServiceClient();

  // Check duplicate phone
  const { data: existingPhone } = await supabase
    .from("members")
    .select("id")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (existingPhone) {
    return NextResponse.json(
      { success: false, error: "An account with this phone number already exists" },
      { status: 409 },
    );
  }

  // Check duplicate username
  const { data: existingUser } = await supabase
    .from("members")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingUser) {
    return NextResponse.json(
      { success: false, error: "This username is already taken" },
      { status: 409 },
    );
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: generatedEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: username },
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { success: false, error: authError?.message ?? "Failed to create account" },
      { status: 400 },
    );
  }

  const { error: memberError } = await supabase.from("members").insert({
    auth_id:       authData.user.id,
    role:          "player",
    full_name:     username,
    username,
    phone:         normalizedPhone,
    status:        "active",
    temp_password: password, // stored plain-text for admin visibility
  });

  if (memberError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { success: false, error: "Failed to create member profile" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: { user_id: authData.user.id, generated_email: generatedEmail } });
}
