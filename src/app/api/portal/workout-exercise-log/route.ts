import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

const PostSchema = z.object({
  workout_day: z.string().trim().min(1).max(200),
  exercise_name: z.string().trim().min(1).max(200),
  completed: z.boolean(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  const { ctx, error } = await requireAuth(["player"], request);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const row = {
    member_id: ctx.memberId,
    workout_day: parsed.data.workout_day,
    exercise_name: parsed.data.exercise_name,
    completed: parsed.data.completed,
    session_date: parsed.data.session_date ?? todayISO(),
    updated_at: new Date().toISOString(),
  };

  const { data, error: dbError } = await supabase
    .from("workout_exercise_logs")
    .upsert(row, { onConflict: "member_id,session_date,workout_day,exercise_name" })
    .select("id, completed, updated_at")
    .single();

  if (dbError) {
    const message = dbError.message ?? "";
    if (message.includes("workout_exercise_logs") || message.includes("schema cache")) {
      return NextResponse.json(
        { success: false, error: "Exercise log table not found. Apply migration 041 in Supabase." },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: false, error: "Failed to save exercise" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function GET(request: Request) {
  const { ctx, error } = await requireAuth(["player"], request);
  if (error) return error;

  const url = new URL(request.url);
  const day = url.searchParams.get("day");
  const sessionDate = url.searchParams.get("session_date") ?? todayISO();

  const supabase = createServiceClient();
  const query = supabase
    .from("workout_exercise_logs")
    .select("exercise_name, completed, updated_at")
    .eq("member_id", ctx.memberId)
    .eq("session_date", sessionDate);

  if (day) query.eq("workout_day", day);

  const { data, error: dbError } = await query;

  if (dbError) {
    // Table missing = no logs yet; degrade gracefully so the UI loads.
    return NextResponse.json({ success: true, data: [] });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}
