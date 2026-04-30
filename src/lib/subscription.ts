// ═══════════════════════════════════════════════════════════════
// OX GYM — SUBSCRIPTION UTILITIES
//
// Canonical expiry thresholds (used everywhere — dashboard, portal,
// cron, members list). Keep these aligned with the cron reminder
// cadence (7-day + 3-day reminders in /api/cron).
// ═══════════════════════════════════════════════════════════════

import type { MemberStatus } from "@/types";

/** "expiring" window — last N days before expiry. */
export const EXPIRING_WINDOW_DAYS = 7;
/** Grace period — N days after expiry where the member can still use the app. */
export const GRACE_PERIOD_DAYS    = 2;

/**
 * Calculate days until a subscription expires.
 * Returns negative numbers for already-expired subscriptions.
 */
export function daysUntilExpiry(endDate: string | null): number {
  if (!endDate) return -999;
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determine subscription status from end date.
 * "expiring" triggers within EXPIRING_WINDOW_DAYS so dashboard + cron
 * agree on what counts as "expiring soon".
 */
export function getSubscriptionStatus(endDate: string | null): MemberStatus {
  const days = daysUntilExpiry(endDate);
  if (days < 0) return "expired";
  if (days <= EXPIRING_WINDOW_DAYS) return "expiring";
  return "active";
}

/**
 * Granular status including grace period and hard lock.
 *   active   — more than EXPIRING_WINDOW_DAYS remaining
 *   expiring — 0–EXPIRING_WINDOW_DAYS remaining (show polite reminder)
 *   grace    — within GRACE_PERIOD_DAYS past expiry (still allowed in)
 *   locked   — beyond grace period (app blocked)
 */
export type DetailedSubStatus = "active" | "expiring" | "grace" | "locked";

export function getDetailedStatus(endDate: string | null): DetailedSubStatus {
  const days = daysUntilExpiry(endDate);
  if (days > EXPIRING_WINDOW_DAYS) return "active";
  if (days >= 0)                   return "expiring";
  if (days >= -GRACE_PERIOD_DAYS)  return "grace";
  return "locked";
}

/**
 * Check if premium features should be locked.
 * Allows a 2-day grace period after expiry before locking.
 */
export function isFeatureLocked(endDate: string | null): boolean {
  return daysUntilExpiry(endDate) < -2;
}

/** True only during the 2-day grace window. */
export function isInGracePeriod(endDate: string | null): boolean {
  const days = daysUntilExpiry(endDate);
  return days < 0 && days >= -2;
}
