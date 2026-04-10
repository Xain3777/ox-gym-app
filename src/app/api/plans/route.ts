import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import type { ApiResponse } from "@/types";

const PlanSchema = z.object({
  name:           z.string().min(1, "Name is required"),
  category:       z.string().min(1, "Category is required"),
  level:          z.enum(["beginner", "intermediate", "advanced"]),
  duration_weeks: z.number().int().min(1).max(52),
  content:        z.array(z.any()),
  created_by:     z.string().min(1, "Creator name is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body   = await request.json();
    const result = PlanSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: result.error.errors[0]?.message ?? "Validation failed" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("workout_plans")
      .insert(result.data)
      .select()
      .single();

    if (error) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json<ApiResponse<typeof data>>(
      { success: true, data },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workout_plans")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiResponse<typeof data>>({ success: true, data });
}
