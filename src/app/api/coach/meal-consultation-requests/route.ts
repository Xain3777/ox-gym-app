import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

const COACH_ROLES = ["manager", "admin", "head_coach", "coach"] as const;

const PatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "contacted", "closed"]),
});

type RequestRow = {
  id: string;
  member_id: string;
  note: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type MemberRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

export async function GET(request: Request) {
  const { error } = await requireAuth([...COACH_ROLES], request);
  if (error) return error;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const countOnly = url.searchParams.get("count") === "1";

  const supabase = createServiceClient();

  if (countOnly) {
    const query = supabase
      .from("meal_consultation_requests")
      .select("id", { count: "exact", head: true });
    if (status) query.eq("status", status);
    const { count, error: countErr } = await query;
    if (countErr) {
      return NextResponse.json(
        { success: false, error: missingTableMessage(countErr.message) },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true, data: { count: count ?? 0 } });
  }

  const requestsQuery = supabase
    .from("meal_consultation_requests")
    .select("id, member_id, note, status, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) requestsQuery.eq("status", status);

  const { data: requestsData, error: requestsErr } = await requestsQuery;

  if (requestsErr) {
    return NextResponse.json(
      { success: false, error: missingTableMessage(requestsErr.message) },
      { status: 500 },
    );
  }

  const requests = (requestsData ?? []) as RequestRow[];
  const memberIds = Array.from(new Set(requests.map((r) => r.member_id)));

  let members: MemberRow[] = [];
  if (memberIds.length > 0) {
    const { data: membersData, error: membersErr } = await supabase
      .from("members")
      .select("id, full_name, phone")
      .in("id", memberIds);
    if (membersErr) {
      return NextResponse.json({ success: false, error: "Failed to load members" }, { status: 500 });
    }
    members = (membersData ?? []) as MemberRow[];
  }

  const memberMap = new Map(members.map((m) => [m.id, m]));

  const rows = requests.map((r) => ({
    id: r.id,
    member_id: r.member_id,
    member_name: memberMap.get(r.member_id)?.full_name ?? null,
    member_phone: memberMap.get(r.member_id)?.phone ?? null,
    note: r.note,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  return NextResponse.json({ success: true, data: rows });
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireAuth([...COACH_ROLES], request);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { error: dbError } = await supabase
    .from("meal_consultation_requests")
    .update({
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);

  if (dbError) {
    return NextResponse.json({ success: false, error: "Failed to update request" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

function missingTableMessage(message: string): string {
  if (message.includes("meal_consultation_requests") || message.includes("schema cache")) {
    return "Consultation requests table not found. Apply migration 038 in Supabase.";
  }
  return message || "Failed to load consultation requests.";
}
