import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

const COACH_ROLES = ["manager", "admin", "head_coach", "coach"] as const;

const MediaPatchSchema = z.object({
  exercise_media_id: z.string().uuid(),
  machine_name: z.string().trim().max(120).nullable().optional(),
  machine_image_url: z.string().trim().max(500).nullable().optional(),
  demo_image_url: z.string().trim().max(500).nullable().optional(),
  demo_video_url: z.string().trim().max(500).nullable().optional(),
  instructions: z.string().trim().max(1000).nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  const { error } = await requireAuth([...COACH_ROLES], request);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = MediaPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const { exercise_media_id, ...updates } = parsed.data;
  const supabase = createServiceClient();
  const { data, error: dbError } = await supabase
    .from("exercise_media")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", exercise_media_id)
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ success: false, error: "Failed to update media" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
