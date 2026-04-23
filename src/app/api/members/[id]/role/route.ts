import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

const RoleSchema = z.object({
  role: z.enum(["player", "coach", "reception", "manager"]),
});

// PATCH /api/members/[id]/role — manager only
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(["manager"], request);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const result = RoleSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error: dbError } = await supabase
    .from("members")
    .update({ role: result.data.role })
    .eq("id", params.id);

  if (dbError) {
    return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
