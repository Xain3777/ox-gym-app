import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

const RatingSchema = z.record(z.number().int().min(1).max(5));
const CommentSchema = z.record(z.string().max(1000));

const FeedbackSchema = z.object({
  ratings:  RatingSchema,
  comments: CommentSchema.optional(),
});

export async function POST(request: Request) {
  const { ctx, error } = await requireAuth(["player"]);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const result = FeedbackSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const service = createServiceClient();
  const { error: dbError } = await service
    .from("feedback")
    .insert({ member_id: ctx.memberId, ...result.data });

  if (dbError) {
    return NextResponse.json({ success: false, error: "Failed to submit feedback" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
