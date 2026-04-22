import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const LoginSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
});

// POST — return role after successful Supabase client-side auth
export async function POST(request: Request) {
  // Rate limit: 20 role lookups per IP per minute
  const ip = getClientIp(request);
  const rl = checkRateLimit(`login-role:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait and try again." },
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

  const result = LoginSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  const { user_id } = result.data;
  const supabase = createServiceClient();

  const { data: member } = await supabase
    .from("members")
    .select("role")
    .eq("auth_id", user_id)
    .single();

  return NextResponse.json({
    success: true,
    data: { role: member?.role ?? "player" },
  });
}
