import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { phoneToEmail } from "@/lib/phone";

// GET /api/auth/resolve?username=... or ?phone=...
// Returns the actual auth.users email for the matched member, looked up
// via the Auth Admin API. This makes the result correct regardless of
// how the email was minted (UUID-derived for new player signups,
// phone-derived for staff seeded via scripts/seed_staff.mjs).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const phone    = searchParams.get("phone");

  if (!username && !phone) {
    return NextResponse.json({ success: false, error: "username or phone required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Username path → look up member, then fetch the real auth email
  if (username) {
    const { data: member } = await supabase
      .from("members")
      .select("auth_id")
      .ilike("username", username)
      .maybeSingle();

    if (!member?.auth_id) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const { data: authUser, error } = await supabase.auth.admin.getUserById(member.auth_id);
    if (error || !authUser?.user?.email) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, email: authUser.user.email });
  }

  // Phone path — for staff and any legacy phone-based members. Try a DB
  // lookup first so we return the real stored email; fall back to the
  // deterministic derivation if no member row matches yet.
  const { data: member } = await supabase
    .from("members")
    .select("auth_id")
    .eq("phone", phone)
    .maybeSingle();

  if (member?.auth_id) {
    const { data: authUser } = await supabase.auth.admin.getUserById(member.auth_id);
    if (authUser?.user?.email) {
      return NextResponse.json({ success: true, email: authUser.user.email });
    }
  }

  return NextResponse.json({ success: true, email: phoneToEmail(phone!) });
}
