import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const SignupSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
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
  // Rate limit: 5 signups per IP per 15 minutes
  const ip = getClientIp(request);
  const rl = checkRateLimit(`signup:${ip}`, 5, 15 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const result = SignupSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const { full_name, phone, password } = result.data;
  // Internal email derived from phone — only used for Supabase Auth, never shown to users
  const digits = phone.replace(/\D/g, "");
  const generatedEmail = `${digits}@member.oxgym.app`;

  const supabase = createServiceClient();

  // Check for duplicate phone
  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { success: false, error: "An account with this phone number already exists" },
      { status: 409 },
    );
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: generatedEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { success: false, error: authError?.message ?? "Failed to create account" },
      { status: 400 },
    );
  }

  const { error: memberError } = await supabase.from("members").insert({
    auth_id: authData.user.id,
    role: "player",
    full_name,
    phone,
    status: "active",
    // email intentionally omitted — phone is the sole identifier
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
