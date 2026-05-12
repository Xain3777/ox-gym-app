import type { SupabaseClient } from "@supabase/supabase-js";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Format: 2 random uppercase letters + 6 random digits (e.g. QK482917).
// Space size ≈ 676,000,000; collisions are astronomically unlikely at
// the scale of a single gym.
export function generateActivationCode(): string {
  const l1 = LETTERS[Math.floor(Math.random() * 26)];
  const l2 = LETTERS[Math.floor(Math.random() * 26)];
  const digits = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `${l1}${l2}${digits}`;
}

export function isActivationCodeShape(code: string): boolean {
  return /^[A-Z]{2}\d{6}$/.test(code);
}

// Generates a code that is not currently present in gym_subscriptions.
// Pass a service-role client so the lookup bypasses RLS.
export async function generateUniqueActivationCode(
  supabase: SupabaseClient,
): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateActivationCode();
    const { data } = await supabase
      .from("gym_subscriptions")
      .select("id")
      .eq("activation_code", code)
      .limit(1)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error("activation_code: could not find a unique code after 10 attempts");
}
