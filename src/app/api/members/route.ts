import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import type { ApiResponse } from "@/types";

const MIN_PRICE = 1; // SAR — prevent $0 abuse

const AddMemberSchema = z.object({
  full_name:  z.string().min(2, "Name must be at least 2 characters").max(100),
  email:      z.string().email("Invalid email address").max(254),
  phone:      z.string().max(20).optional(),
  goals:      z.string().max(500).optional(),
  plan_type:  z.enum(["monthly", "quarterly", "annual"]),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  end_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  price:      z.number().min(MIN_PRICE, `Price must be at least ${MIN_PRICE}`).max(100_000),
}).refine(
  (d) => new Date(d.end_date) > new Date(d.start_date),
  { message: "End date must be after start date", path: ["end_date"] },
);

// ── POST /api/members — manager + reception only ──────────────
export async function POST(request: NextRequest) {
  const { ctx, error } = await requireAuth(["manager", "reception"]);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json<ApiResponse>({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const result = AddMemberSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: result.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const { full_name, email, phone, goals, plan_type, start_date, end_date, price } = result.data;
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "A member with this email already exists" },
      { status: 409 },
    );
  }

  const { data: member, error: memberError } = await supabase
    .from("members")
    .insert({ full_name, email, phone: phone ?? null, goals: goals ?? null, status: "active" })
    .select()
    .single();

  if (memberError || !member) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to create member" }, { status: 500 });
  }

  const { error: subError } = await supabase.from("subscriptions").insert({
    member_id: member.id,
    plan_type,
    start_date,
    end_date,
    status: "active",
    price,
  });

  if (subError) {
    await supabase.from("members").delete().eq("id", member.id);
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to create subscription" }, { status: 500 });
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    actor_id:   ctx.memberId,
    action:     "member.create",
    target_id:  member.id,
    target_type: "member",
    meta: { full_name, email, plan_type },
  }).then(() => {});

  return NextResponse.json<ApiResponse<{ id: string }>>(
    { success: true, data: { id: member.id } },
    { status: 201 },
  );
}

// ── GET /api/members — manager + reception + coach ────────────
export async function GET() {
  const { error } = await requireAuth(["manager", "reception", "coach"]);
  if (error) return error;

  const supabase = createServiceClient();
  const { data, error: dbError } = await supabase
    .from("members")
    .select("*, subscription:subscriptions(*)")
    .order("created_at", { ascending: false });

  if (dbError) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to fetch members" }, { status: 500 });
  }

  return NextResponse.json<ApiResponse<typeof data>>({ success: true, data });
}
