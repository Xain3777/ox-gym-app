import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, differenceInDays, format } from "date-fns";

// ── CN HELPER ─────────────────────────────────────────────────
// Merges Tailwind classes safely, resolving conflicts.
// Usage: cn("px-4", condition && "py-2", "text-gold")
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── DATE HELPERS ──────────────────────────────────────────────

/** Returns days remaining until a date. Negative = already expired. */
export function daysUntil(date: string | Date): number {
  return differenceInDays(new Date(date), new Date());
}

/** Returns a human-readable relative date string */
export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/** Formats a date as "Mar 28, 2025" */
export function formatDate(date: string | Date): string {
  return format(new Date(date), "MMM d, yyyy");
}

/** Formats a date as "March 2025" */
export function formatMonthYear(date: string | Date): string {
  return format(new Date(date), "MMMM yyyy");
}

// ── MEMBER STATUS ─────────────────────────────────────────────

export type MemberStatus = "active" | "expiring" | "expired";

/**
 * Derives display status from subscription end date.
 * - expired:  end_date in the past
 * - expiring: end_date within 7 days
 * - active:   more than 7 days remaining
 */
export function getMemberStatus(endDate: string | null): MemberStatus {
  if (!endDate) return "expired";
  const days = daysUntil(endDate);
  if (days < 0)  return "expired";
  if (days <= 7) return "expiring";
  return "active";
}

/** Returns label + color class for a status badge */
export function getStatusMeta(status: MemberStatus) {
  const map = {
    active: {
      label: "Active",
      className: "border border-green-500/25 bg-green-500/10 text-green-400",
    },
    expiring: {
      label: "Expiring",
      className: "border border-gold/20 bg-gold-10 text-gold",
    },
    expired: {
      label: "Expired",
      className: "border border-red-700/25 bg-red-900/20 text-danger",
    },
  } as const;
  return map[status];
}

// ── STRING HELPERS ────────────────────────────────────────────

/** Returns initials from a full name. "Ahmed Khalil" → "AK" */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

/** Truncates a string to maxLength with ellipsis */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

// ── NUMBER HELPERS ────────────────────────────────────────────

/** Formats a number with commas: 1234 → "1,234" */
export function formatNumber(n: number): string {
  return n.toLocaleString();
}

/** Formats currency: 250 → "250 SAR" */
export function formatCurrency(amount: number, currency = "SAR"): string {
  return `${amount.toLocaleString()} ${currency}`;
}
