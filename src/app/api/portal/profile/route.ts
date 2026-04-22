import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

// GET — logged-in member's profile + subscription
export async function GET() {
  const { ctx, error } = await requireAuth();
  if (error) return error;

  const service = createServiceClient();
  const { data: member, error: dbError } = await service
    .from("members")
    .select("*, subscription:subscriptions(*)")
    .eq("id", ctx.memberId)
    .single();

  if (dbError || !member) {
    return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
  }

  const sub = Array.isArray(member.subscription)
    ? member.subscription[0] ?? null
    : member.subscription;

  return NextResponse.json({ success: true, data: { ...member, subscription: sub } });
}
