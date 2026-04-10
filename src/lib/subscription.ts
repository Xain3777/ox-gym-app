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
 */
export function getSubscriptionStatus(endDate: string | null): MemberStatus {
  const days = daysUntilExpiry(endDate);
  if (days < 0) return "expired";
  if (days <= 7) return "expiring";
  return "active";
}

/**
 * Check if premium features should be locked.
 */
export function isFeatureLocked(endDate: string | null): boolean {
  return getSubscriptionStatus(endDate) === "expired";
}
