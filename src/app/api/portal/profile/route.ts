import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { ensureMemberAppProfile, upsertMemberAppProfile } from "@/lib/member-app-profile";

// GET — logged-in member's profile + subscription
export async function GET() {
  const { ctx, error } = await requireAuth(["player"]);
  if (error) return error;

  const service = createServiceClient();
  const { data: member, error: dbError } = await service
    .from("members")
    .select("id, full_name, phone, status, goals, subscription:subscriptions(*)")
    .eq("id", ctx.memberId)
    .single();

  if (dbError || !member) {
    return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
  }

  const appProfile = await ensureMemberAppProfile(service, ctx.userId, ctx.memberId);

  const sub = Array.isArray(member.subscription)
    ? member.subscription[0] ?? null
    : member.subscription;

  return NextResponse.json({
    success: true,
    data: {
      ...member,
      ...appProfile,
      id: member.id,
      app_profile_id: appProfile?.id ?? null,
      subscription: sub,
    },
  });
}

// PATCH — let the player self-edit their profile.
// Whitelisted columns only — role / auth_id / status / phone_normalized
// are NOT writable from the portal so a player can't escalate themselves
// or steal another member's row by spoofing phone.
const ProfilePatchSchema = z.object({
  full_name:        z.string().trim().min(2).max(100).optional(),
  date_of_birth:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").nullable().optional(),
  gender:           z.string().trim().max(20).nullable().optional(),
  height_cm:        z.number().int().min(80).max(260).nullable().optional(),
  weight_kg:        z.number().min(20).max(400).nullable().optional(),
  illnesses:        z.array(z.string().min(1).max(80)).max(40).optional(),
  injuries:         z.array(z.string().min(1).max(80)).max(40).optional(),
  medical_notes:    z.string().trim().max(1000).nullable().optional(),
  limitations:      z.string().trim().max(1000).nullable().optional(),
  fitness_goal:     z.string().trim().max(200).nullable().optional(),
  fitness_outcome:  z.string().trim().max(200).nullable().optional(),
  training_level:   z.string().trim().max(40).nullable().optional(),
  weight_goal:      z.string().trim().max(40).nullable().optional(),
  goals:            z.string().trim().max(500).nullable().optional(),
});

export async function PATCH(request: Request) {
  const { ctx, error } = await requireAuth(["player"], request);
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = ProfilePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 },
    );
  }

  // Drop undefined fields so we don't clobber existing data with null
  // when the client only sends a partial edit.
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) updates[k] = v;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: true, data: null });
  }

  const service = createServiceClient();
  const { data: member, error: memberError } = await service
    .from("members")
    .select("id, full_name, phone")
    .eq("id", ctx.memberId)
    .single();

  if (memberError || !member) {
    return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
  }

  const profileUpdates = {
    full_name: (updates.full_name as string | undefined) ?? member.full_name,
    phone: member.phone,
    date_of_birth: updates.date_of_birth as string | null | undefined,
    gender: updates.gender as string | null | undefined,
    height_cm: updates.height_cm as number | null | undefined,
    weight_kg: updates.weight_kg as number | null | undefined,
    fitness_goal: updates.fitness_goal as string | null | undefined,
    fitness_outcome: updates.fitness_outcome as string | null | undefined,
    training_level: updates.training_level as string | null | undefined,
    weight_goal: updates.weight_goal as string | null | undefined,
    illnesses: updates.illnesses as string[] | undefined,
    injuries: updates.injuries as string[] | undefined,
    medical_notes: updates.medical_notes as string | null | undefined,
    limitations: updates.limitations as string | null | undefined,
    onboarding_complete: true,
  };

  const appProfile = await upsertMemberAppProfile(service, ctx.userId, ctx.memberId, profileUpdates);
  if (!appProfile) {
    return NextResponse.json({ success: false, error: "Failed to update app profile" }, { status: 500 });
  }

  const memberMirror: Record<string, unknown> = {};
  for (const key of [
    "full_name",
    "date_of_birth",
    "gender",
    "height_cm",
    "weight_kg",
    "fitness_goal",
    "fitness_outcome",
    "training_level",
    "weight_goal",
    "goals",
    "illnesses",
    "injuries",
  ]) {
    if (updates[key] !== undefined) memberMirror[key] = updates[key];
  }
  memberMirror.onboarding_complete = true;

  const { data, error: dbError } = await service
    .from("members")
    .update(memberMirror)
    .eq("id", ctx.memberId)
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
