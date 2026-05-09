import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { normalizePhone } from "@/lib/phone";

// GET /api/members/lookup-phone?phone=...
// Returns the first member whose phone_normalized matches, so the
// reception form can warn live before submission. Manager + reception
// only — players have no business looking other members up by phone.
export async function GET(request: Request) {
  const { error } = await requireAuth(["manager", "reception"], request);
  if (error) return error;

  const url = new URL(request.url);
  const raw = url.searchParams.get("phone")?.trim() ?? "";
  if (!raw) return NextResponse.json({ success: true, data: null });

  const normalized = normalizePhone(raw);
  if (!normalized) return NextResponse.json({ success: true, data: null });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("members")
    .select("id, full_name")
    .eq("phone_normalized", normalized)
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ success: true, data: data ?? null });
}
