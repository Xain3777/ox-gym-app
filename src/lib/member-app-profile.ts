import type { SupabaseClient } from "@supabase/supabase-js";

export type MemberAppProfile = {
  id: string;
  app_user_id: string;
  linked_member_id: string;
  full_name: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  fitness_goal: string | null;
  training_level: string | null;
  weight_goal: string | null;
  fitness_outcome: string | null;
  illnesses: string[];
  injuries: string[];
  medical_notes: string | null;
  limitations: string | null;
  onboarding_complete: boolean;
  app_registered_at: string | null;
  active: boolean;
  activation_code: string | null;
};

const PROFILE_SELECT = `
  id,
  app_user_id,
  linked_member_id,
  full_name,
  phone,
  date_of_birth,
  gender,
  height_cm,
  weight_kg,
  fitness_goal,
  training_level,
  weight_goal,
  fitness_outcome,
  illnesses,
  injuries,
  medical_notes,
  limitations,
  onboarding_complete,
  app_registered_at,
  active,
  activation_code
`;

export async function ensureMemberAppProfile(
  supabase: SupabaseClient,
  appUserId: string,
  linkedMemberId: string,
): Promise<MemberAppProfile | null> {
  const { data: existing } = await supabase
    .from("member_app_profiles")
    .select(PROFILE_SELECT)
    .eq("app_user_id", appUserId)
    .maybeSingle();

  if (existing) return existing as MemberAppProfile;

  const { data: member } = await supabase
    .from("members")
    .select("id, auth_id, full_name, phone, date_of_birth, gender, height_cm, weight_kg, fitness_goal, training_level, weight_goal, fitness_outcome, illnesses, injuries, onboarding_complete")
    .eq("id", linkedMemberId)
    .eq("auth_id", appUserId)
    .maybeSingle();

  if (!member) return null;

  const { data: inserted } = await supabase
    .from("member_app_profiles")
    .insert({
      app_user_id: appUserId,
      linked_member_id: linkedMemberId,
      full_name: member.full_name,
      phone: member.phone,
      date_of_birth: member.date_of_birth,
      gender: member.gender,
      height_cm: member.height_cm,
      weight_kg: member.weight_kg,
      fitness_goal: member.fitness_goal,
      training_level: member.training_level,
      weight_goal: member.weight_goal,
      fitness_outcome: member.fitness_outcome,
      illnesses: member.illnesses ?? [],
      injuries: member.injuries ?? [],
      onboarding_complete: member.onboarding_complete ?? false,
      app_registered_at: new Date().toISOString(),
    })
    .select(PROFILE_SELECT)
    .single();

  return (inserted as MemberAppProfile | null) ?? null;
}

export async function upsertMemberAppProfile(
  supabase: SupabaseClient,
  appUserId: string,
  linkedMemberId: string,
  updates: Partial<MemberAppProfile>,
): Promise<MemberAppProfile | null> {
  const payload = {
    ...updates,
    app_user_id: appUserId,
    linked_member_id: linkedMemberId,
    app_registered_at: updates.app_registered_at ?? new Date().toISOString(),
  };

  const { data } = await supabase
    .from("member_app_profiles")
    .upsert(payload, { onConflict: "app_user_id" })
    .select(PROFILE_SELECT)
    .single();

  return (data as MemberAppProfile | null) ?? null;
}
