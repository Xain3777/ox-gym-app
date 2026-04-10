import { cn } from "@/lib/utils";
import { AlertTriangle, XCircle, CheckCircle, Info, type LucideIcon } from "lucide-react";

type AlertVariant = "warning" | "danger" | "success" | "info";

interface AlertProps {
  variant?:   AlertVariant;
  title:      string;
  description?: string;
  className?: string;
}

const variantStyles: Record<AlertVariant, string> = {
  warning: "border-l-gold bg-gold/5",
  danger:  "border-l-danger bg-danger/10",
  success: "border-l-success bg-success/10",
  info:    "border-l-slate bg-iron",
};

const iconStyles: Record<AlertVariant, string> = {
  warning: "text-gold",
  danger:  "text-danger",
  success: "text-success",
  info:    "text-muted",
};

const icons: Record<AlertVariant, LucideIcon> = {
  warning: AlertTriangle,
  danger:  XCircle,
  success: CheckCircle,
  info:    Info,
};

export function Alert({ variant = "info", title, description, className }: AlertProps) {
  const Icon = icons[variant];

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-5 py-4 border-l-[3px]",
        variantStyles[variant],
        className,
      )}
    >
      <Icon size={16} className={cn("flex-shrink-0 mt-0.5", iconStyles[variant])} />
      <div>
        <p className="font-semibold text-[13px] text-white">{title}</p>
        {description && (
          <p className="text-[12px] text-muted mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}
