import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const { ctx, error } = await requireAuth(["player"]);
  if (error) return error;

  const service = createServiceClient();

  const { data: send } = await service
    .from("plan_sends")
    .select("plan_id")
    .eq("member_id", ctx.memberId)
    .eq("plan_type", "meal")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!send) return NextResponse.json({ success: true, data: null });

  const { data: plan } = await service
    .from("meal_plans")
    .select("*")
    .eq("id", send.plan_id)
    .single();

  return NextResponse.json({ success: true, data: plan ?? null });
}
