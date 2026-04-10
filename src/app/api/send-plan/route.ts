import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import type { SendPlanRequest, ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendPlanRequest;
    const { member_id, plan_id, plan_type } = body;

    if (!member_id || !plan_id || !plan_type) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "member_id, plan_id, and plan_type are required" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    // ── 1. Fetch member ──
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, full_name, email")
      .eq("id", member_id)
      .single();

    if (memberError || !member) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Member not found" },
        { status: 404 },
      );
    }

    // ── 2. Fetch plan ──
    const table = plan_type === "workout" ? "workout_plans" : "meal_plans";
    const { data: plan, error: planError } = await supabase
      .from(table)
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Plan not found" },
        { status: 404 },
      );
    }

    // ── 3. Send email via Resend ──
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error: emailError } = await resend.emails.send({
      from:    `OX Gym <${process.env.EMAIL_FROM ?? "noreply@oxgym.com"}>`,
      to:      member.email,
      subject: `Your OX Gym ${plan_type} plan: ${plan.name}`,
      html:    buildPlanEmailHtml(member.full_name, plan, plan_type),
    });

    // ── 4. Log the send (record success or failure) ──
    await supabase.from("plan_sends").insert({
      member_id,
      plan_id,
      plan_type,
      sent_by: "manager",
      status:  emailError ? "failed" : "sent",
      sent_at: new Date().toISOString(),
    });

    if (emailError) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Email failed: ${emailError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json<ApiResponse>({ success: true });
  } catch (err) {
    console.error("send-plan error:", err);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── EMAIL HTML BUILDER ────────────────────────────────────────
function buildPlanEmailHtml(
  memberName: string,
  plan: Record<string, unknown>,
  planType: string,
): string {
  return `
    <div style="background:#0A0A0A;color:#F0EDE6;font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;">
      <!-- Header -->
      <div style="border-bottom:3px solid #F5C100;padding-bottom:20px;margin-bottom:28px;">
        <div style="font-size:32px;font-weight:900;color:#F5C100;letter-spacing:4px;">OX GYM</div>
        <div style="font-size:10px;color:#777;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">
          HARDER · BETTER · FASTER · STRONGER
        </div>
      </div>

      <!-- Greeting -->
      <h1 style="font-size:22px;color:#fff;margin:0 0 8px;font-weight:600;">
        Your ${planType === "workout" ? "Workout" : "Meal"} Plan is Ready
      </h1>
      <p style="color:#AAAAAA;margin:0 0 24px;line-height:1.7;">
        Hi ${memberName}, your new plan <strong style="color:#F5C100;">${plan.name}</strong> has been assigned by your trainer.
      </p>

      <!-- Plan details box -->
      <div style="background:#1A1A1A;border-left:3px solid #F5C100;padding:20px 24px;margin-bottom:28px;">
        <div style="font-size:10px;color:#777;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Plan Details</div>
        <div style="font-size:18px;color:#fff;font-weight:700;margin-bottom:12px;">${plan.name}</div>
        <div style="font-size:13px;color:#AAAAAA;line-height:1.8;">
          ${planType === "workout"
            ? `Category: ${plan.category}<br>Level: ${plan.level}<br>Duration: ${plan.duration_weeks} weeks`
            : `Goal: ${plan.goal}<br>Daily Calories: ${plan.calories_daily} kcal`}
        </div>
      </div>

      <!-- CTA -->
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://oxgym.com"}/dashboard/workout"
         style="display:inline-block;background:#F5C100;color:#0A0A0A;font-weight:700;
                padding:14px 28px;text-decoration:none;letter-spacing:2px;font-size:13px;
                text-transform:uppercase;margin-bottom:32px;">
        VIEW MY PLAN
      </a>

      <!-- Footer -->
      <div style="border-top:1px solid #333;padding-top:20px;font-size:11px;color:#555;line-height:1.6;">
        OX Gym — Where power, discipline, and progress come together.<br>
        Questions? Contact your trainer directly.
      </div>
    </div>
  `;
}
