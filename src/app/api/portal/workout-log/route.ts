import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

const Schema = z.object({
  workout_day: z.string().trim().min(1).max(200),
  exercises_done: z.number().int().min(0).max(500),
  total_exercises: z.number().int().min(0).max(500),
  partial: z.boolean(),
  logged_at: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  const { ctx, error } = await requireAuth(["player"], request);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data, error: insertError } = await supabase
    .from("workout_logs")
    .insert({
      member_id: ctx.memberId,
      workout_day: parsed.data.workout_day,
      exercises_done: parsed.data.exercises_done,
      total_exercises: parsed.data.total_exercises,
      partial: parsed.data.partial,
      logged_at: parsed.data.logged_at ?? new Date().toISOString(),
    })
    .select("id, logged_at")
    .single();

  if (insertError || !data) {
    return NextResponse.json(
      { success: false, error: "Failed to save workout log" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function GET(request: Request) {
  const { ctx, error } = await requireAuth(["player"], request);
  if (error) return error;

  const supabase = createServiceClient();
  const { data, error: dbError } = await supabase
    .from("workout_logs")
    .select("id, workout_day, exercises_done, total_exercises, partial, logged_at")
    .eq("member_id", ctx.memberId)
    .order("logged_at", { ascending: false })
    .limit(200);

  if (dbError) {
    return NextResponse.json({ success: false, error: "Failed to load logs" }, { status: 500 });
  }
  return NextResponse.json({ success: true, data: data ?? [] });
}
