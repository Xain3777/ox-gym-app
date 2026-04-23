import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { phoneToEmail } from "@/lib/phone";

// GET /api/auth/resolve?username=... or ?phone=...
// Returns the internal Supabase email for a given username or phone.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const phone    = searchParams.get("phone");

  if (!username && !phone) {
    return NextResponse.json({ success: false, error: "username or phone required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (username) {
    const { data } = await supabase
      .from("members")
      .select("phone")
      .eq("username", username)
      .maybeSingle();

    if (!data?.phone) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, email: phoneToEmail(data.phone) });
  }

  // phone lookup
  return NextResponse.json({ success: true, email: phoneToEmail(phone!) });
}
