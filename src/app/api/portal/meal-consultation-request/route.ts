import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

const Schema = z.object({
  note: z.string().trim().max(500).optional(),
});

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const { ctx, error } = await requireAuth(["player"], request);
  if (error) return error;

  let body: unknown = {};
  if (request.headers.get("content-length") !== "0") {
    try { body = await request.json(); }
    catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // 24-hour dedupe: if the same player has a pending request in the last 24h, return it.
  const since = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();
  const { data: existing } = await supabase
    .from("meal_consultation_requests")
    .select("id, status, created_at")
    .eq("member_id", ctx.memberId)
    .eq("status", "pending")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      success: true,
      data: existing,
      duplicate: true,
      message: "طلبك السابق قيد المعالجة — سيتواصل معك الكوتش قريباً.",
    });
  }

  const { data, error: insertError } = await supabase
    .from("meal_consultation_requests")
    .insert({
      member_id: ctx.memberId,
      note: parsed.data.note?.trim() || null,
      status: "pending",
    })
    .select("id, status, created_at")
    .single();

  if (insertError || !data) {
    const message = insertError?.message ?? "";
    if (message.includes("meal_consultation_requests") || message.includes("schema cache")) {
      return NextResponse.json(
        { success: false, error: "Consultation requests table not found. Apply migration 038 in Supabase." },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: false, error: "Failed to submit request" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function GET(request: Request) {
  const { ctx, error } = await requireAuth(["player"], request);
  if (error) return error;

  const supabase = createServiceClient();
  const { data, error: dbError } = await supabase
    .from("meal_consultation_requests")
    .select("id, status, note, created_at, updated_at")
    .eq("member_id", ctx.memberId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (dbError) {
    return NextResponse.json({ success: false, error: "Failed to load requests" }, { status: 500 });
  }
  return NextResponse.json({ success: true, data: data ?? [] });
}
