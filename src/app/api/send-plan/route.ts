import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import type { ApiResponse } from "@/types";

const SendPlanSchema = z.object({
  member_id: z.string().uuid("Invalid member ID"),
  plan_id:   z.string().uuid("Invalid plan ID"),
  plan_type: z.enum(["workout", "meal"]),
});

// POST — manager + coach only
export async function POST(request: NextRequest) {
  const { ctx, error } = await requireAuth(["manager", "coach"], request);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json<ApiResponse>({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const result = SendPlanSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: result.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  const { member_id, plan_id, plan_type } = result.data;
  const supabase = createServiceClient();

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id, full_name, email")
    .eq("id", member_id)
    .single();

  if (memberError || !member) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Member not found" }, { status: 404 });
  }

  const table = plan_type === "workout" ? "workout_plans" : "meal_plans";
  const { data: plan, error: planError } = await supabase
    .from(table)
    .select("*")
    .eq("id", plan_id)
    .single();

  if (planError || !plan) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Plan not found" }, { status: 404 });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error: emailError } = await resend.emails.send({
    from:    `OX Gym <${process.env.EMAIL_FROM ?? "noreply@oxgym.com"}>`,
    to:      member.email,
    subject: `Your OX Gym ${plan_type} plan: ${escapeHtml(String(plan.name))}`,
    html:    buildPlanEmailHtml(member.full_name, plan, plan_type),
  });

  await supabase.from("plan_sends").insert({
    member_id,
    plan_id,
    plan_type,
    sent_by: ctx.memberId,
    status:  emailError ? "failed" : "sent",
    sent_at: new Date().toISOString(),
  });

  if (emailError) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Email delivery failed. Log recorded." },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiResponse>({ success: true });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function buildPlanEmailHtml(
  memberName: string,
  plan: Record<string, unknown>,
  planType: string,
): string {
  const safeName     = escapeHtml(String(plan.name ?? ""));
  const safeCategory = escapeHtml(String(plan.category ?? ""));
  const safeLevel    = escapeHtml(String(plan.level ?? ""));
  const safeGoal     = escapeHtml(String(plan.goal ?? ""));
  const safeMember   = escapeHtml(String(memberName));

  return `
    <div style="background:#0A0A0A;color:#F0EDE6;font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;">
      <div style="border-bottom:3px solid #F5C100;padding-bottom:20px;margin-bottom:28px;">
        <div style="font-size:32px;font-weight:900;color:#F5C100;letter-spacing:4px;">OX GYM</div>
        <div style="font-size:10px;color:#777;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">
          HARDER · BETTER · FASTER · STRONGER
        </div>
      </div>
      <h1 style="font-size:22px;color:#fff;margin:0 0 8px;font-weight:600;">
        Your ${planType === "workout" ? "Workout" : "Meal"} Plan is Ready
      </h1>
      <p style="color:#AAAAAA;margin:0 0 24px;line-height:1.7;">
        Hi ${safeMember}, your new plan <strong style="color:#F5C100;">${safeName}</strong> has been assigned by your trainer.
      </p>
      <div style="background:#1A1A1A;border-left:3px solid #F5C100;padding:20px 24px;margin-bottom:28px;">
        <div style="font-size:10px;color:#777;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Plan Details</div>
        <div style="font-size:18px;color:#fff;font-weight:700;margin-bottom:12px;">${safeName}</div>
        <div style="font-size:13px;color:#AAAAAA;line-height:1.8;">
          ${planType === "workout"
            ? `Category: ${safeCategory}<br>Level: ${safeLevel}<br>Duration: ${escapeHtml(String(plan.duration_weeks ?? ""))} weeks`
            : `Goal: ${safeGoal}<br>Daily Calories: ${escapeHtml(String(plan.calories_daily ?? ""))} kcal`}
        </div>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://oxgym.com"}/portal"
         style="display:inline-block;background:#F5C100;color:#0A0A0A;font-weight:700;
                padding:14px 28px;text-decoration:none;letter-spacing:2px;font-size:13px;
                text-transform:uppercase;margin-bottom:32px;">
        VIEW MY PLAN
      </a>
      <div style="border-top:1px solid #333;padding-top:20px;font-size:11px;color:#555;line-height:1.6;">
        OX Gym — Where power, discipline, and progress come together.
      </div>
    </div>
  `;
}
