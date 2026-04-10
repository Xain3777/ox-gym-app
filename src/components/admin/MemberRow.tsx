import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/Badge";
import { cn, getMemberStatus, daysUntil, formatDate } from "@/lib/utils";
import type { MemberWithSub } from "@/types";

interface MemberRowProps {
  member:     MemberWithSub;
  className?: string;
}

export function MemberRow({ member, className }: MemberRowProps) {
  const status  = getMemberStatus(member.subscription?.end_date ?? null);
  const endDate = member.subscription?.end_date;
  const days    = endDate ? daysUntil(endDate) : null;

  return (
    <Link
      href={`/members/${member.id}`}
      className={cn(
        "flex items-center gap-4 px-5 py-4",
        "bg-iron border border-steel",
        "transition-[border-color,background] duration-[220ms]",
        "hover:border-gold/40 hover:bg-gunmetal",
        "group",
        className,
      )}
    >
      {/* Avatar */}
      <Avatar
        name={member.full_name}
        photoUrl={member.photo_url}
        size="md"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[14px] text-white truncate">
          {member.full_name}
        </p>
        <p className="text-[12px] text-muted truncate mt-0.5">
          {member.subscription?.plan_type
            ? `${member.subscription.plan_type.charAt(0).toUpperCase() + member.subscription.plan_type.slice(1)} Plan`
            : "No active plan"}{" "}
          {endDate && (
            <span className={cn(
              days !== null && days <= 7 && days >= 0 ? "text-gold" : "",
              days !== null && days < 0 ? "text-danger" : "",
            )}>
              · {days !== null && days < 0
                  ? "Expired"
                  : days !== null && days <= 7
                  ? `${days}d left`
                  : `Expires ${formatDate(endDate)}`}
            </span>
          )}
        </p>
      </div>

      {/* Status badge */}
      <StatusBadge status={status} />

      {/* Arrow */}
      <ChevronRight
        size={14}
        className="text-steel group-hover:text-gold transition-colors duration-[120ms] flex-shrink-0"
      />
    </Link>
  );
}
