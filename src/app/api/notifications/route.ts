import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

const NotificationSchema = z.object({
  type:      z.enum(["announcement", "reminder", "promotion", "alert"]),
  title:     z.string().min(1).max(100, "Title must be under 100 characters"),
  message:   z.string().min(1).max(1000, "Message must be under 1000 characters"),
  audience:  z.enum(["all", "active", "expiring", "specific"]),
  member_id: z.string().uuid().optional(),
}).refine(
  (d) => d.audience !== "specific" || !!d.member_id,
  { message: "member_id is required for specific audience", path: ["member_id"] },
);

// GET — manager + reception only
export async function GET() {
  const { error } = await requireAuth(["manager", "reception"]);
  if (error) return error;

  const supabase = createServiceClient();
  const { data, error: dbError } = await supabase
    .from("notifications")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(50);

  if (dbError) {
    return NextResponse.json({ success: false, error: "Failed to fetch notifications" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

// POST — manager only
export async function POST(request: Request) {
  const { ctx, error } = await requireAuth(["manager"]);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const result = NotificationSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const { type, title, message, audience, member_id } = result.data;
  const supabase = createServiceClient();

  if (audience === "specific" && member_id) {
    const { error: dbError } = await supabase.from("notifications").insert({
      member_id,
      type,
      title,
      message,
      audience,
      status: "sent",
      created_by: ctx.memberId,
    });

    if (dbError) {
      return NextResponse.json({ success: false, error: "Failed to send notification" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  let query = supabase.from("members").select("id");
  if (audience === "active")    query = query.eq("status", "active");
  if (audience === "expiring")  query = query.eq("status", "expiring");

  const { data: members, error: fetchError } = await query;
  if (fetchError) {
    return NextResponse.json({ success: false, error: "Failed to fetch members" }, { status: 500 });
  }
  if (!members?.length) {
    return NextResponse.json({ success: false, error: "No members match the selected audience" }, { status: 400 });
  }

  const rows = members.map((m) => ({
    member_id:  m.id,
    type,
    title,
    message,
    audience,
    status:     "sent" as const,
    created_by: ctx.memberId,
  }));

  const { error: insertError } = await supabase.from("notifications").insert(rows);
  if (insertError) {
    return NextResponse.json({ success: false, error: "Failed to insert notifications" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { count: members.length } });
}
