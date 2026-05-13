import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { loadMealProgramForMember } from "@/lib/meal-programs";

export async function GET(request: Request) {
  const { ctx, error } = await requireAuth(["player"], request);
  if (error) return error;

  try {
    const supabase = createServiceClient();
    const { assignment, template } = await loadMealProgramForMember(supabase, ctx.memberId);
    return NextResponse.json({ success: true, data: { assignment, template } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load meal program";
    if (message.includes("meal_program_templates") || message.includes("schema cache")) {
      // Table not yet provisioned — return empty assignment so the UI stays usable.
      return NextResponse.json({ success: true, data: { assignment: null, template: null } });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
