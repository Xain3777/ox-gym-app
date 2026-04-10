import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// POST — handle signup server-side using service client (bypasses RLS)
export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, full_name, phone } = body;

  if (!email || !password || !full_name) {
    return NextResponse.json(
      { success: false, error: "Email, password, and full name are required" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // auto-confirm so they can log in immediately
    user_metadata: { full_name },
  });

  if (authError) {
    return NextResponse.json(
      { success: false, error: authError.message },
      { status: 400 },
    );
  }

  if (!authData.user) {
    return NextResponse.json(
      { success: false, error: "Failed to create user" },
      { status: 500 },
    );
  }

  // 2. Create member record (service client bypasses RLS)
  const { error: memberError } = await supabase.from("members").insert({
    auth_id: authData.user.id,
    role: "player",
    full_name,
    email,
    phone: phone || null,
    status: "active",
  });

  if (memberError) {
    // Clean up: delete the auth user if member creation fails
    await supabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { success: false, error: memberError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    data: { user_id: authData.user.id },
  });
}
