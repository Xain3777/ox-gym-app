// ═══════════════════════════════════════════════════════════════
// OX GYM — SUBSCRIPTION UTILITIES
// ═══════════════════════════════════════════════════════════════

import type { MemberStatus } from "@/types";

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
 * "expiring" triggers at 5 days so a notification can be shown.
 */
export function getSubscriptionStatus(endDate: string | null): MemberStatus {
  const days = daysUntilExpiry(endDate);
  if (days < 0) return "expired";
  if (days <= 5) return "expiring";
  return "active";
}

/**
 * Granular status including grace period and hard lock.
 *   active   — more than 5 days remaining
 *   expiring — 0–5 days remaining (show polite reminder)
 *   grace    — 0 to 2 days past expiry (still allowed in, gentle warning)
 *   locked   — more than 2 days past expiry (app blocked)
 */
export type DetailedSubStatus = "active" | "expiring" | "grace" | "locked";

export function getDetailedStatus(endDate: string | null): DetailedSubStatus {
  const days = daysUntilExpiry(endDate);
  if (days > 5)  return "active";
  if (days >= 0) return "expiring";
  if (days >= -2) return "grace";
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
