import { cn } from "@/lib/utils";
import type { MemberStatus } from "@/types";

// ── STATUS BADGE ──────────────────────────────────────────────
interface StatusBadgeProps {
  status:     MemberStatus;
  className?: string;
}

const statusStyles: Record<MemberStatus, string> = {
  active:   "border border-green-500/25 bg-green-500/10 text-green-400",
  expiring: "border border-gold/20 bg-gold/10 text-gold",
  expired:  "border border-red-700/25 bg-red-900/20 text-danger",
};

const statusLabels: Record<MemberStatus, string> = {
  active:   "Active",
  expiring: "Expiring",
  expired:  "Expired",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-block font-mono text-[9px] tracking-[0.1em] uppercase px-1.5 py-0.5",
        statusStyles[status],
        className,
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

// ── GENERIC BADGE ─────────────────────────────────────────────
type BadgeVariant = "gold" | "muted" | "danger" | "success";

interface BadgeProps {
  variant?:   BadgeVariant;
  children:   React.ReactNode;
  className?: string;
}

const badgeVariants: Record<BadgeVariant, string> = {
  gold:    "border border-gold/20 bg-gold/10 text-gold",
  muted:   "border border-steel text-ghost",
  danger:  "border border-danger/25 bg-danger/10 text-danger",
  success: "border border-success/25 bg-success/12 text-success",
};

export function Badge({ variant = "muted", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block font-mono text-[9px] tracking-[0.08em] uppercase px-2 py-0.5",
        badgeVariants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
