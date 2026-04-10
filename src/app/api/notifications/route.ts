import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import type { SendNotificationRequest } from "@/types";

// GET — list notifications (most recent first)
export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

// POST — send a notification
export async function POST(request: Request) {
  const body: SendNotificationRequest = await request.json();
  const { type, title, message, audience, member_id } = body;

  if (!title || !message) {
    return NextResponse.json(
      { success: false, error: "Title and message are required" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // If audience is "specific", insert one row for that member
  if (audience === "specific" && member_id) {
    const { error } = await supabase.from("notifications").insert({
      member_id,
      type,
      title,
      message,
      audience,
      status: "sent",
      created_by: "manager",
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // For broadcast audiences (all, active, expiring), fetch matching members
  let query = supabase.from("members").select("id, email, full_name");

  if (audience === "active") {
    query = query.eq("status", "active");
  } else if (audience === "expiring") {
    query = query.eq("status", "expiring");
  }
  // "all" — no filter

  const { data: members, error: fetchError } = await query;

  if (fetchError) {
    return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
  }

  if (!members || members.length === 0) {
    return NextResponse.json(
      { success: false, error: "No members match the selected audience" },
      { status: 400 },
    );
  }

  // Insert notification records for each member
  const rows = members.map((m) => ({
    member_id: m.id,
    type,
    title,
    message,
    audience,
    status: "sent" as const,
    created_by: "admin",
  }));

  const { error: insertError } = await supabase.from("notifications").insert(rows);

  if (insertError) {
    return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { count: members.length } });
}
