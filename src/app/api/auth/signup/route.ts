import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { normalizePhone, phoneToEmail } from "@/lib/phone";

const SignupSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(40),
  last_name:  z.string().min(1, "Last name is required").max(40),
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

  const { first_name, last_name, phone, password } = result.data;
  const fullName        = `${first_name.trim()} ${last_name.trim()}`.trim();
  const username        = fullName; // username = "First Last" (spaces allowed)
  const normalizedPhone = normalizePhone(phone);
  const generatedEmail  = phoneToEmail(phone);

  const supabase = createServiceClient();

  // Check duplicate phone (normalized)
  const { data: existingPhone } = await supabase
    .from("members")
    .select("id")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (existingPhone) {
    return NextResponse.json(
      { success: false, error: "هذا الرقم مسجّل مسبقاً" },
      { status: 409 },
    );
  }

  // Check duplicate username (case-insensitive)
  const { data: existingUser } = await supabase
    .from("members")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (existingUser) {
    return NextResponse.json(
      { success: false, error: "هذا الاسم مستخدم من قبل. استخدم اسماً مختلفاً." },
      { status: 409 },
    );
  }

  // Create auth user. If there is an orphaned auth user from a prior failed attempt
  // (same phone), remove it first so the new signup can proceed cleanly.
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: generatedEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError || !authData.user) {
    const msg = (authError?.message ?? "").toLowerCase();
    const isDup = msg.includes("already") || msg.includes("registered") || msg.includes("exists");

    if (isDup) {
      // Clean up orphaned auth user (auth exists but no members row)
      try {
        const { data: listData } = await supabase.auth.admin.listUsers();
        const orphan = listData?.users?.find((u) => u.email === generatedEmail);
        if (orphan) {
          const { data: hasMember } = await supabase
            .from("members")
            .select("id")
            .eq("auth_id", orphan.id)
            .maybeSingle();

          if (!hasMember) {
            await supabase.auth.admin.deleteUser(orphan.id);
            // Retry signup after cleanup
            const retry = await supabase.auth.admin.createUser({
              email: generatedEmail,
              password,
              email_confirm: true,
              user_metadata: { full_name: fullName },
            });
            if (retry.data?.user) {
              return await finalizeSignup(retry.data.user.id, fullName, username, normalizedPhone, password);
            }
          }
        }
      } catch {
        // fall through to phone-exists error
      }
      return NextResponse.json(
        { success: false, error: "هذا الرقم مسجّل مسبقاً" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { success: false, error: "تعذّر إنشاء الحساب. حاول مرة أخرى." },
      { status: 400 },
    );
  }

  return await finalizeSignup(authData.user.id, fullName, username, normalizedPhone, password);
}

async function finalizeSignup(
  authId: string,
  fullName: string,
  username: string,
  phone: string,
  password: string,
) {
  const supabase = createServiceClient();

  const { error: memberError } = await supabase.from("members").insert({
    auth_id:       authId,
    role:          "player",
    full_name:     fullName,
    username,
    phone,
    status:        "active",
    temp_password: password,
  });

  if (memberError) {
    await supabase.auth.admin.deleteUser(authId);
    return NextResponse.json(
      { success: false, error: "تعذّر إنشاء الملف الشخصي" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: { user_id: authId } });
}
