import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { fetchAllRows } from "@/lib/fetch-all";

// Account-health diagnostics for the reception "fixer" page.
// Returns 4 buckets:
//   1. needs_intervention — same list the coach sees, with reasons
//   2. duplicate_phones   — phones with >1 members rows (stub + app)
//   3. orphan_subs        — gym_subscriptions with no activated_user_id
//                           but a matching app account exists by phone
//   4. expired_bound      — players whose only bound sub is expired
//                           (need reception renewal)
//
// Read-only — every action button on the UI hits a separate POST
// endpoint with explicit auth + audit.

const RECEPTION_ROLES = ["manager", "admin", "reception", "head_coach"] as const;

function normalizePhone(raw: string | null): string {
  if (!raw) return "";
  const w = raw.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const digits = w.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("963")) return digits;
  if (digits.startsWith("0"))   return "963" + digits.slice(1);
  return digits;
}

export async function GET(request: Request) {
  const { error } = await requireAuth([...RECEPTION_ROLES], request);
  if (error) return error;

  const supabase = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  // fetchAllRows — page past PostgREST's 1000-row cap. Both
  // members(role=player) (~1100) and gym_subscriptions (~1120) exceed it,
  // so a single .select() silently dropped the newest rows and hid
  // recently-paid members from this page too.
  const [
    { data: membersData },
    { data: profilesData },
    { data: subsData },
  ] = await Promise.all([
    fetchAllRows<{
      id: string; auth_id: string | null; full_name: string | null; phone: string | null;
      phone_normalized: string | null; role: string | null; status: string | null; created_at: string | null;
    }>(() => supabase.from("members")
      .select("id, auth_id, full_name, phone, phone_normalized, role, status, created_at")
      .eq("role", "player")),
    fetchAllRows<{
      id: string; app_user_id: string | null; linked_member_id: string | null; full_name: string | null;
      phone: string | null; phone_normalized: string | null; active: boolean | null;
      activation_code: string | null; app_registered_at: string | null; onboarding_complete: boolean | null;
    }>(() => supabase.from("member_app_profiles")
      .select("id, app_user_id, linked_member_id, full_name, phone, phone_normalized, active, activation_code, app_registered_at, onboarding_complete")),
    fetchAllRows<{
      id: string; member_id: string | null; member_name: string | null; phone: string | null;
      phone_normalized: string | null; amount: number | null; activation_code: string | null;
      activated_user_id: string | null; activated_at: string | null; cancelled_at: string | null;
      end_date: string | null; status: string | null; created_at: string | null;
      private_coach_name: string | null; payment_status: string | null; payment_method: string | null;
    }>(() => supabase.from("gym_subscriptions")
      .select("id, member_id, member_name, phone, phone_normalized, amount, activation_code, activated_user_id, activated_at, cancelled_at, end_date, status, created_at, private_coach_name, payment_status, payment_method")),
  ]);

  const members  = membersData ?? [];
  const profiles = profilesData ?? [];
  const subs     = subsData ?? [];

  // ── Helpers ──────────────────────────────────────────────
  const profileByAuth = new Map<string, typeof profiles[number]>();
  for (const p of profiles) if (p.app_user_id) profileByAuth.set(p.app_user_id as string, p);

  // Prefer the DB-computed phone_normalized column (populated by the
  // gym_subscriptions trigger from migration 0069). Fall back to the
  // JS normalizer for rows that predate the trigger.
  const subPhoneKey = (s: (typeof subs)[number]) =>
    (s.phone_normalized as string | null) || normalizePhone(s.phone as string | null);

  const subsByPhone = new Map<string, typeof subs>();
  for (const s of subs) {
    if (s.cancelled_at) continue;
    const pn = subPhoneKey(s);
    if (!pn) continue;
    const list = subsByPhone.get(pn) ?? [];
    list.push(s);
    subsByPhone.set(pn, list);
  }

  const phoneToMembers = new Map<string, typeof members>();
  for (const m of members) {
    const pn = m.phone_normalized || normalizePhone(m.phone as string | null);
    if (!pn) continue;
    const list = phoneToMembers.get(pn) ?? [];
    list.push(m);
    phoneToMembers.set(pn, list);
  }

  // ── Bucket 1: needs_intervention ─────────────────────────
  type Reason =
    | "expired_bound"
    | "code_stolen"
    | "no_code_entered"
    | "no_dashboard_sub"
    | "no_app_registration"
    | "duplicate";

  const reasonText: Record<Reason, string> = {
    expired_bound:       "انتهى الاشتراك — يحتاج تجديد من الاستقبال",
    code_stolen:         "الكود مأخوذ من حساب آخر",
    no_code_entered:     "لم يدخل كود التفعيل بعد",
    no_dashboard_sub:    "لا يوجد اشتراك في الاستقبال — يحتاج إنشاء",
    no_app_registration: "لم يكمل التسجيل في التطبيق",
    duplicate:           "حساب مكرر — يحتاج توحيد",
  };

  const intervention: Array<{
    member_id: string;
    auth_id: string | null;
    full_name: string;
    phone: string | null;
    reason: Reason;
    reason_text: string;
    actionable: boolean;     // can the UI auto-fix this with one button?
    suggested_action: "auto_activate" | "delete_duplicate" | "rebind" | "renew" | "create_sub" | "none";
    orphan_sub_id?: string;  // if auto_activate, the sub id to bind
    other_member_id?: string; // if delete_duplicate, the row to consider
  }> = [];

  for (const m of members) {
    if (!m.auth_id) continue;
    const profile = profileByAuth.get(m.auth_id as string);
    const hasAppReg = Boolean(profile?.app_registered_at);
    const pn = m.phone_normalized || normalizePhone(m.phone as string | null);
    const phoneSubs = pn ? subsByPhone.get(pn) ?? [] : [];

    const myLive       = phoneSubs.find((s) => s.activated_user_id === m.auth_id && (s.end_date as string) >= today);
    const myExpired    = phoneSubs.find((s) => s.activated_user_id === m.auth_id && (s.end_date as string) < today);
    const stolenByOther = phoneSubs.find((s) => s.activated_user_id && s.activated_user_id !== m.auth_id && (s.end_date as string) >= today);
    const unboundLive   = phoneSubs.find((s) => !s.activated_user_id && (s.end_date as string) >= today);
    const dupMembersCount = (phoneToMembers.get(pn) ?? []).length;

    // Already activated and assignable? Skip.
    if (myLive) continue;

    let reason: Reason | null = null;
    let action: typeof intervention[number]["suggested_action"] = "none";
    let orphanSubId: string | undefined;
    let otherMemberId: string | undefined;

    if (!hasAppReg) {
      reason = "no_app_registration";
      action = "none";
    } else if (unboundLive) {
      reason = "no_code_entered";
      action = "auto_activate";
      orphanSubId = unboundLive.id as string;
    } else if (stolenByOther) {
      reason = "code_stolen";
      action = "rebind";
      orphanSubId = stolenByOther.id as string;
    } else if (myExpired) {
      reason = "expired_bound";
      action = "renew";
    } else if (phoneSubs.length === 0) {
      reason = "no_dashboard_sub";
      action = "create_sub";
    } else if (dupMembersCount > 1) {
      reason = "duplicate";
      action = "delete_duplicate";
      // Suggest deleting the stub (auth_id null) if present, else the app row
      const stub = (phoneToMembers.get(pn) ?? []).find((x) => !x.auth_id);
      otherMemberId = stub?.id as string | undefined;
    }

    if (!reason) continue;

    intervention.push({
      member_id: m.id as string,
      auth_id:   m.auth_id as string,
      full_name: profile?.full_name ?? (m.full_name as string) ?? "—",
      phone:     (m.phone as string | null) ?? null,
      reason,
      reason_text: reasonText[reason],
      actionable: action !== "none",
      suggested_action: action,
      orphan_sub_id: orphanSubId,
      other_member_id: otherMemberId,
    });
  }

  // ── Bucket 2: duplicate_phones (phones with >1 members rows) ─
  const duplicates: Array<{
    phone_normalized: string;
    phone_display: string;
    rows: Array<{
      member_id: string;
      auth_id: string | null;
      full_name: string;
      created_at: string;
      kind: "app" | "stub";
    }>;
  }> = [];
  for (const entry of Array.from(phoneToMembers.entries())) {
    const pn = entry[0];
    const list = entry[1];
    if (list.length <= 1) continue;
    duplicates.push({
      phone_normalized: pn,
      phone_display: (list[0].phone as string | null) ?? pn,
      rows: list.map((m: typeof list[number]) => ({
        member_id:  m.id as string,
        auth_id:    (m.auth_id as string | null) ?? null,
        full_name:  (m.full_name as string) ?? "—",
        created_at: (m.created_at as string) ?? "",
        kind:       (m.auth_id ? "app" : "stub") as "app" | "stub",
      })).sort((a: { created_at: string }, b: { created_at: string }) => a.created_at.localeCompare(b.created_at)),
    });
  }
  duplicates.sort((a, b) => a.phone_display.localeCompare(b.phone_display));

  // ── Bucket 3: orphan_subs (unbound + has matching app account) ─
  const orphanSubs: Array<{
    sub_id: string;
    member_name: string;
    phone: string | null;
    amount: number | null;
    activation_code: string;
    end_date: string;
    matching_member_id: string;
    matching_full_name: string;
    matching_auth_id: string;
  }> = [];
  for (const s of subs) {
    if (s.cancelled_at) continue;
    if (s.activated_user_id) continue;
    if ((s.end_date as string) < today) continue;
    const pn = (s.phone_normalized as string | null) || normalizePhone(s.phone as string | null);
    if (!pn) continue;
    const candidateMember = (phoneToMembers.get(pn) ?? []).find((m) => m.auth_id);
    if (!candidateMember) continue;
    orphanSubs.push({
      sub_id:           s.id as string,
      member_name:      (s.member_name as string) ?? "—",
      phone:            (s.phone as string | null) ?? null,
      amount:           (s.amount as number | null) ?? null,
      activation_code:  s.activation_code as string,
      end_date:         s.end_date as string,
      matching_member_id: candidateMember.id as string,
      matching_full_name: (profileByAuth.get(candidateMember.auth_id as string)?.full_name as string)
        ?? (candidateMember.full_name as string)
        ?? "—",
      matching_auth_id:   candidateMember.auth_id as string,
    });
  }

  // ── Bucket 4: expired_bound (only sub is expired) ────────
  const expiredBound: Array<{
    member_id: string;
    full_name: string;
    phone: string | null;
    sub_id: string;
    activation_code: string;
    amount: number | null;
    ended_on: string;
  }> = [];
  for (const m of members) {
    if (!m.auth_id) continue;
    const pn = m.phone_normalized || normalizePhone(m.phone as string | null);
    if (!pn) continue;
    const phoneSubs = subsByPhone.get(pn) ?? [];
    const hasLive = phoneSubs.some((s) => (s.end_date as string) >= today);
    if (hasLive) continue;
    const lastBound = phoneSubs
      .filter((s) => s.activated_user_id === m.auth_id)
      .sort((a, b) => (b.end_date as string).localeCompare(a.end_date as string))[0];
    if (!lastBound) continue;
    expiredBound.push({
      member_id:       m.id as string,
      full_name:       (profileByAuth.get(m.auth_id as string)?.full_name as string)
        ?? (m.full_name as string)
        ?? "—",
      phone:           (m.phone as string | null) ?? null,
      sub_id:          lastBound.id as string,
      activation_code: lastBound.activation_code as string,
      amount:          (lastBound.amount as number | null) ?? null,
      ended_on:        lastBound.end_date as string,
    });
  }

  // ── Bucket 4.4: private_coach_sessions (any sub with private_coach_name set) ─
  // The amount on these rows DOES count in today's revenue totals
  // (they're regular gym_subscriptions inserts), but reception wanted
  // a dedicated breakdown so they can see who got private coaching,
  // from which coach, and on what date.
  const privateSessions: Array<{
    sub_id: string;
    member_name: string;
    phone: string | null;
    coach_name: string;
    amount: number | null;
    payment_status: string | null;
    payment_method: string | null;
    end_date: string;
    cancelled_at: string | null;
    created_at: string;
  }> = [];
  for (const s of subs) {
    if (!s.private_coach_name) continue;
    privateSessions.push({
      sub_id:          s.id as string,
      member_name:     (s.member_name as string) ?? "—",
      phone:           (s.phone as string | null) ?? null,
      coach_name:      s.private_coach_name as string,
      amount:          (s.amount as number | null) ?? null,
      payment_status:  (s.payment_status as string | null) ?? null,
      payment_method:  (s.payment_method as string | null) ?? null,
      end_date:        s.end_date as string,
      cancelled_at:    (s.cancelled_at as string | null) ?? null,
      created_at:      s.created_at as string,
    });
  }
  privateSessions.sort((a, b) => b.created_at.localeCompare(a.created_at));

  // ── Bucket 4.5: missing_profiles (live bound sub but profile gone) ─
  // The activation link is the source of truth; if the profile row is
  // missing the coach UI degrades. Surface them so reception can fix
  // with one click (the coach assign endpoints self-heal too, but this
  // bucket lets reception clean it proactively).
  const profileAuthSet = new Set<string>();
  for (const p of profiles) if (p.app_user_id) profileAuthSet.add(p.app_user_id as string);
  const liveSubsByAuth = new Map<string, typeof subs[number]>();
  for (const s of subs) {
    if (s.cancelled_at) continue;
    if (!s.activated_user_id) continue;
    if ((s.end_date as string) < today) continue;
    const existing = liveSubsByAuth.get(s.activated_user_id as string);
    if (!existing || (existing.end_date as string) < (s.end_date as string)) {
      liveSubsByAuth.set(s.activated_user_id as string, s);
    }
  }
  const missingProfiles: Array<{
    member_id: string;
    auth_id: string;
    full_name: string;
    phone: string | null;
    sub_id: string;
    activation_code: string;
    end_date: string;
  }> = [];
  for (const m of members) {
    if (!m.auth_id) continue;
    if (profileAuthSet.has(m.auth_id as string)) continue;
    const sub = liveSubsByAuth.get(m.auth_id as string);
    if (!sub) continue;
    missingProfiles.push({
      member_id:       m.id as string,
      auth_id:         m.auth_id as string,
      full_name:       (m.full_name as string) ?? "—",
      phone:           (m.phone as string | null) ?? null,
      sub_id:          sub.id as string,
      activation_code: sub.activation_code as string,
      end_date:        sub.end_date as string,
    });
  }

  // ── Bucket 5: all_players (every player with auth, for quick actions) ─
  const allPlayers: Array<{
    member_id: string;
    auth_id: string | null;
    full_name: string;
    phone: string | null;
    status: string;
    has_live_sub: boolean;
    current_code: string | null;
    sub_end_date: string | null;
    sub_id: string | null;
    has_app_registration: boolean;
  }> = [];
  for (const m of members) {
    if (!m.auth_id) continue;
    const pn = m.phone_normalized || normalizePhone(m.phone as string | null);
    const phoneSubs = pn ? subsByPhone.get(pn) ?? [] : [];
    const liveBound = phoneSubs.find((s) => s.activated_user_id === m.auth_id && (s.end_date as string) >= today);
    const profile = profileByAuth.get(m.auth_id as string);
    allPlayers.push({
      member_id:           m.id as string,
      auth_id:             m.auth_id as string,
      full_name:           (profile?.full_name as string) ?? (m.full_name as string) ?? "—",
      phone:               (m.phone as string | null) ?? null,
      status:              (m.status as string) ?? "active",
      has_live_sub:        Boolean(liveBound),
      current_code:        (liveBound?.activation_code as string) ?? null,
      sub_end_date:        (liveBound?.end_date as string) ?? null,
      sub_id:              (liveBound?.id as string) ?? null,
      has_app_registration: Boolean(profile?.app_registered_at),
    });
  }
  allPlayers.sort((a, b) => a.full_name.localeCompare(b.full_name));

  return NextResponse.json({
    success: true,
    counts: {
      intervention: intervention.length,
      duplicates: duplicates.length,
      orphan_subs: orphanSubs.length,
      expired_bound: expiredBound.length,
      missing_profiles: missingProfiles.length,
      private_sessions: privateSessions.length,
      all_players: allPlayers.length,
    },
    data: {
      intervention,
      duplicates,
      orphan_subs: orphanSubs,
      expired_bound: expiredBound,
      missing_profiles: missingProfiles,
      private_sessions: privateSessions,
      all_players: allPlayers,
    },
  });
}
