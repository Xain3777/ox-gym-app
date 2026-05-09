import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: Request) {
  const { error } = await requireAuth(["player", "coach", "head_coach", "manager", "admin"], request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ success: false, error: "slug is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error: dbError } = await supabase
    .from("partner_cards")
    .select("slug, title, eyebrow, subtitle, bullets, logo_url, owner_title, owner_name, supervisor_name, supervisor_phone, contact_phone, center_phone, center_phone_2, cta_label, cta_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (dbError) {
    return NextResponse.json({ success: false, error: "Failed to load partner" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
