// ═══════════════════════════════════════════════════════════════
// OX GYM — Subscription milestone notifier
//
// Pure logic that decides which notifications a player should receive
// for their subscription's end_date relative to today. Used by the
// daily cron (/api/cron) and by the manual admin trigger
// (/api/admin/run-sub-notifier). All copy is in Arabic.
//
// Time is computed in Damascus time (Asia/Damascus). The cron itself
// runs in UTC, so we normalize "today" before comparing dates.
// ═══════════════════════════════════════════════════════════════

export const DAMASCUS_TZ = "Asia/Damascus";

/** Milestones at which a player gets a subscription notification.
 * Offset = days until expiry. Negative = past expiry. */
export const MILESTONE_OFFSETS = [2, 1, 0, -1, -2] as const;
export type MilestoneOffset = (typeof MILESTONE_OFFSETS)[number];

/**
 * Return today's date in Damascus time as `YYYY-MM-DD`. Date arithmetic
 * everywhere in this module is anchored to this so a player whose
 * subscription ends on May 30 (Damascus) won't be reminded a day early
 * because the cron container happens to be running in UTC.
 */
export function damascusTodayISO(now: Date = new Date()): string {
  // en-CA gives YYYY-MM-DD format.
  return now.toLocaleDateString("en-CA", { timeZone: DAMASCUS_TZ });
}

/** Returns the offset (days_left = endDate - today) for a given
 * end_date, in whole calendar days, using Damascus time. */
export function daysLeftDamascus(endDateISO: string, now: Date = new Date()): number {
  const todayStr = damascusTodayISO(now);
  // Use UTC math on date-only strings to avoid TZ shifts.
  const today = new Date(todayStr + "T00:00:00Z");
  const end   = new Date(endDateISO.slice(0, 10) + "T00:00:00Z");
  return Math.round((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

/** Arabic copy per milestone. */
export function milestoneCopy(offset: MilestoneOffset): { title: string; message: string } {
  switch (offset) {
    case 2:  return {
      title:   "اشتراكك ينتهي قريباً",
      message: "بقي يومان على انتهاء اشتراكك. الرجاء زيارة الاستقبال للتجديد.",
    };
    case 1:  return {
      title:   "يوم واحد متبقٍ",
      message: "اشتراكك ينتهي غداً. لا تنقطع رحلتك — جدّد من الاستقبال.",
    };
    case 0:  return {
      title:   "اشتراكك انتهى",
      message: "لديك يومان للتدريب في النادي قبل قفل الوصول. الرجاء التجديد.",
    };
    case -1: return {
      title:   "آخر يوم في النادي",
      message: "اليوم آخر يوم تستطيع فيه التدريب قبل توقف الوصول. الرجاء التجديد.",
    };
    case -2: return {
      title:   "انتهت فترة المهلة",
      message: "لقد انتهى اشتراكك ولا يمكنك دخول النادي. الرجاء زيارة الاستقبال للتجديد.",
    };
  }
}

/** Stable key per (player, end_date, milestone). Used as
 * notifications.milestone_key. Idempotent at the unique index. */
export function milestoneKey(endDateISO: string, offset: MilestoneOffset): string {
  return `sub_reminder:${endDateISO.slice(0, 10)}:T${offset >= 0 ? "+" : ""}${offset}`;
}

export type CandidatePlayer = {
  member_id: string;
  end_date: string;          // ISO, "YYYY-MM-DD..."
  cancelled_at: string | null;
};

export type NotificationRow = {
  member_id: string;
  type: "reminder";
  title: string;
  message: string;
  audience: "specific";
  milestone_key: string;
  created_by: null;          // cron has no actor; column is UUID
};

/** Build the list of notification rows to upsert today for a batch of
 * players. Returns one row per player whose end_date sits exactly on a
 * milestone (today + 2, +1, 0, -1, -2). Cancelled subs are skipped. */
export function buildNotificationsForToday(
  players: CandidatePlayer[],
  now: Date = new Date(),
): NotificationRow[] {
  const rows: NotificationRow[] = [];
  for (const p of players) {
    if (p.cancelled_at) continue;
    if (!p.end_date) continue;
    const days = daysLeftDamascus(p.end_date, now);
    if (!MILESTONE_OFFSETS.includes(days as MilestoneOffset)) continue;
    const off = days as MilestoneOffset;
    const copy = milestoneCopy(off);
    rows.push({
      member_id:     p.member_id,
      type:          "reminder",
      title:         copy.title,
      message:       copy.message,
      audience:      "specific",
      milestone_key: milestoneKey(p.end_date, off),
      created_by:    null,
    });
  }
  return rows;
}
