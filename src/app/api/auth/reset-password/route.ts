import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RequestSchema = z.object({
  phone: z
    .string()
    .min(7)
    .max(20)
    .regex(/^\+?[\d\s\-()]+$/, "Invalid phone number"),
});

const ConfirmSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
  access_token: z.string().min(1),
});

// POST /api/auth/reset-password — send reset email
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`reset:${ip}`, 3, 15 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
    );
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const result = RequestSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const digits = result.data.phone.replace(/\D/g, "");
  const email = `${digits}@member.oxgym.app`;

  const supabase = createServiceClient();

  // Verify member exists before sending (don't leak existence via response timing)
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  // Always return success to prevent phone enumeration
  if (!member) {
    return NextResponse.json({ success: true });
  }

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/confirm`,
  });

  return NextResponse.json({ success: true });
}

// PATCH /api/auth/reset-password — set new password with token
export async function PATCH(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const result = ConfirmSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const { password, access_token } = result.data;
  const supabase = createServiceClient();

  // Verify token signature + expiry via Supabase — never decode manually
  const { data: { user }, error: tokenError } = await supabase.auth.getUser(access_token);
  if (tokenError || !user) {
    return NextResponse.json({ success: false, error: "Invalid or expired reset link" }, { status: 400 });
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
  if (error) {
    return NextResponse.json({ success: false, error: "Failed to update password" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
