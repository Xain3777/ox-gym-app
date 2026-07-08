import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/fetch-all";

// ── Auto-bind app accounts to their paid gym subscription by phone ──
//
// The activation code is friction: members pay at reception, sign up in
// the app, but never type the printed code — so their subscription stays
// unbound and the coach can't see them. This module removes that friction
// by linking an app account to its paid, in-date, non-cancelled, UNBOUND
// subscription whenever the normalized phone matches.
//
// Safety: signup enforces one app account per phone (partial unique index
// members_player_phone_normalized_unique), so a live unbound sub for a
// given phone can belong to only one app account. We still guard every
// bind with a conditional `.is("activated_user_id", null)` update so two
// concurrent binds can't both win, and we never touch a sub already
// claimed by someone else (that's the "code stolen" case → reception).

/** Pure-JS phone normalizer mirroring lib/phone + the DB ox_normalize_phone. */
export function normalizeSubscriptionPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const latin = String(raw).replace(/[٠-٩۰-۹]/g, (d) => {
    const code = d.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    return String(code - 0x06F0);
  });
  const digits = latin.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("963")) return digits;
  if (digits.startsWith("0")) return "963" + digits.slice(1);
  return digits;
}

export type AutoBindResult = {
  bound: boolean;
  reason: "bound" | "no_phone" | "already_bound" | "no_unbound_sub" | "lost_race";
  subId?: string;
  activationCode?: string;
};

/**
 * Bind ONE app account (auth id) to its matching paid, in-date, unbound
 * subscription. No-op if the account is already covered by a live bound
 * sub, or if no unbound live sub matches its phone.
 */
export async function autoBindSubscriptionByPhone(
  supabase: SupabaseClient,
  authId: string,
  rawPhone: string | null | undefined,
): Promise<AutoBindResult> {
  const pn = normalizeSubscriptionPhone(rawPhone);
  if (!pn) return { bound: false, reason: "no_phone" };

  const today = new Date().toISOString().slice(0, 10);

  // Already has a live bound sub → nothing to do.
  const { data: existing } = await supabase
    .from("gym_subscriptions")
    .select("id")
    .eq("activated_user_id", authId)
    .is("cancelled_at", null)
    .gte("end_date", today)
    .limit(1)
    .maybeSingle();
  if (existing) return { bound: false, reason: "already_bound" };

  // Every currently-unbound, in-date, non-cancelled sub (bounded set), then
  // match on normalized phone in JS so rows with a null phone_normalized
  // column (predating the trigger) still match.
  const { data: unbound } = await fetchAllRows<{
    id: string; phone: string | null; phone_normalized: string | null;
    activation_code: string | null; end_date: string | null;
  }>(() => supabase
    .from("gym_subscriptions")
    .select("id, phone, phone_normalized, activation_code, end_date")
    .is("activated_user_id", null)
    .is("cancelled_at", null)
    .gte("end_date", today));

  const matches = (unbound ?? [])
    .filter((s) => ((s.phone_normalized as string | null) || normalizeSubscriptionPhone(s.phone as string | null)) === pn)
    .sort((a, b) => String(b.end_date).localeCompare(String(a.end_date)));

  if (matches.length === 0) return { bound: false, reason: "no_unbound_sub" };

  const target = matches[0];
  const { data: claimed } = await supabase
    .from("gym_subscriptions")
    .update({ activated_user_id: authId, activated_at: new Date().toISOString() })
    .eq("id", target.id as string)
    .is("activated_user_id", null)
    .select("id, activation_code")
    .maybeSingle();

  if (!claimed) return { bound: false, reason: "lost_race" };

  // Sync app profile so coach eligibility recognises them immediately.
  await supabase
    .from("member_app_profiles")
    .update({ active: true, activation_code: claimed.activation_code as string })
    .eq("app_user_id", authId);

  return {
    bound: true,
    reason: "bound",
    subId: claimed.id as string,
    activationCode: claimed.activation_code as string,
  };
}

/**
 * Bulk sweep: for every unbound, in-date, non-cancelled sub whose phone
 * matches exactly ONE app account, bind it. Skips phones shared by more
 * than one app account (ambiguous) and accounts that already have a live
 * bound sub. Idempotent — safe to run on every cron tick.
 */
export async function sweepAutoBindByPhone(
  supabase: SupabaseClient,
): Promise<{ bound: number; scanned: number; ambiguous: number }> {
  const today = new Date().toISOString().slice(0, 10);

  // fetchAllRows — page past the 1000-row cap so the sweep sees every
  // player account, not just the first 1000.
  const [{ data: members }, { data: subs }] = await Promise.all([
    fetchAllRows<{ id: string; auth_id: string | null; phone: string | null; phone_normalized: string | null }>(() =>
      supabase
        .from("members")
        .select("id, auth_id, phone, phone_normalized")
        .eq("role", "player")
        .not("auth_id", "is", null)),
    fetchAllRows<{ id: string; phone: string | null; phone_normalized: string | null; activation_code: string | null; end_date: string | null; activated_user_id: string | null }>(() =>
      supabase
        .from("gym_subscriptions")
        .select("id, phone, phone_normalized, activation_code, end_date, activated_user_id")
        .is("activated_user_id", null)
        .is("cancelled_at", null)
        .gte("end_date", today)),
  ]);

  // phone → single auth id; null marks an ambiguous phone (>1 app account).
  const authByPhone = new Map<string, string | null>();
  for (const m of members ?? []) {
    const pn = (m.phone_normalized as string | null) || normalizeSubscriptionPhone(m.phone as string | null);
    if (!pn) continue;
    authByPhone.set(pn, authByPhone.has(pn) ? null : (m.auth_id as string));
  }

  // Bind latest-ending sub first so an account lands on its best sub.
  const ordered = (subs ?? []).slice().sort((a, b) => String(b.end_date).localeCompare(String(a.end_date)));

  let bound = 0;
  let ambiguous = 0;
  const coveredThisRun = new Set<string>();

  for (const s of ordered) {
    const pn = (s.phone_normalized as string | null) || normalizeSubscriptionPhone(s.phone as string | null);
    if (!pn) continue;
    if (!authByPhone.has(pn)) continue;
    const authId = authByPhone.get(pn);
    if (authId === null) { ambiguous++; continue; }
    if (!authId || coveredThisRun.has(authId)) continue;

    // Skip if this account already has a live bound sub.
    const { data: already } = await supabase
      .from("gym_subscriptions")
      .select("id")
      .eq("activated_user_id", authId)
      .is("cancelled_at", null)
      .gte("end_date", today)
      .limit(1)
      .maybeSingle();
    if (already) { coveredThisRun.add(authId); continue; }

    const { data: claimed } = await supabase
      .from("gym_subscriptions")
      .update({ activated_user_id: authId, activated_at: new Date().toISOString() })
      .eq("id", s.id as string)
      .is("activated_user_id", null)
      .select("id, activation_code")
      .maybeSingle();
    if (!claimed) continue;

    await supabase
      .from("member_app_profiles")
      .update({ active: true, activation_code: claimed.activation_code as string })
      .eq("app_user_id", authId);

    coveredThisRun.add(authId);
    bound++;
  }

  return { bound, scanned: ordered.length, ambiguous };
}
