import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// POST — verify credentials and return user role
// The actual session is set client-side via supabase.auth.signInWithPassword
// This route just returns the role so the client knows where to redirect.
export async function POST(request: Request) {
  const body = await request.json();
  const { user_id } = body;

  if (!user_id) {
    return NextResponse.json(
      { success: false, error: "user_id is required" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const { data: member, error } = await supabase
    .from("members")
    .select("role")
    .eq("auth_id", user_id)
    .single();

  if (error || !member) {
    return NextResponse.json(
      { success: true, data: { role: "player" } },
    );
  }

  return NextResponse.json({
    success: true,
    data: { role: member.role },
  });
}
