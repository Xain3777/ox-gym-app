import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// Public — no auth required. Used by uptime monitors (UptimeRobot, BetterStack, etc.)
export async function GET() {
  const start = Date.now();
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("members").select("id").limit(1);
    if (error) throw error;

    return NextResponse.json({
      status:   "ok",
      db:       "ok",
      latencyMs: Date.now() - start,
      ts:       new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status:   "error",
        db:       "unreachable",
        error:    String(err),
        latencyMs: Date.now() - start,
        ts:       new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
