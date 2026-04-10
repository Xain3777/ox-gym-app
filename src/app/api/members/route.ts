import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import type { ApiResponse } from "@/types";

// ── VALIDATION SCHEMA ─────────────────────────────────────────
const AddMemberSchema = z.object({
  full_name:  z.string().min(2, "Name must be at least 2 characters"),
  email:      z.string().email("Invalid email address"),
  phone:      z.string().optional(),
  goals:      z.string().optional(),
  plan_type:  z.enum(["monthly", "quarterly", "annual"]),
  start_date: z.string(),
  end_date:   z.string(),
  price:      z.number().optional(),
});

// ── POST /api/members ─────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate
    const result = AddMemberSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: result.error.errors[0]?.message ?? "Validation failed" },
        { status: 400 },
      );
    }

    const { full_name, email, phone, goals, plan_type, start_date, end_date, price } = result.data;
    const supabase = createServiceClient();

    // ── 1. Check for duplicate email ──
    const { data: existing } = await supabase
      .from("members")
      .select("id")
      .eq("email", email)
      .single();

    if (existing) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "A member with this email already exists" },
        { status: 409 },
      );
    }

    // ── 2. Create member ──
    const { data: member, error: memberError } = await supabase
      .from("members")
      .insert({ full_name, email, phone: phone ?? null, goals: goals ?? null, status: "active" })
      .select()
      .single();

    if (memberError || !member) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Failed to create member" },
        { status: 500 },
      );
    }

    // ── 3. Create subscription ──
    const { error: subError } = await supabase
      .from("subscriptions")
      .insert({
        member_id:  member.id,
        plan_type,
        start_date,
        end_date,
        status: "active",
        price:  price ?? null,
      });

    if (subError) {
      // Rollback member if subscription creation fails
      await supabase.from("members").delete().eq("id", member.id);
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Failed to create subscription" },
        { status: 500 },
      );
    }

    return NextResponse.json<ApiResponse<{ id: string }>>(
      { success: true, data: { id: member.id } },
      { status: 201 },
    );
  } catch (err) {
    console.error("create-member error:", err);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── GET /api/members ──────────────────────────────────────────
export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("members")
    .select("*, subscription:subscriptions(*)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiResponse<typeof data>>({ success: true, data });
}
