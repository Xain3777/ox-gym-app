import { cn } from "@/lib/utils";

// ── TYPES ──────────────────────────────────────────────────────
type CardVariant = "default" | "accent" | "top" | "stat" | "ghost";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:  CardVariant;
  children:  React.ReactNode;
  hoverable?: boolean;
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  as?: "h1" | "h2" | "h3" | "h4";
}

// ── VARIANT STYLES ────────────────────────────────────────────
const variantStyles: Record<CardVariant, string> = {
  default: "bg-iron border border-steel shadow-[0_1px_3px_rgba(0,0,0,0.3)]",
  accent:  "bg-iron border-t border-r border-b border-steel border-l-[3px] border-l-gold shadow-[0_1px_3px_rgba(0,0,0,0.3)]",
  top:     "bg-iron border border-steel border-t-[3px] border-t-gold shadow-[0_1px_3px_rgba(0,0,0,0.3)]",
  stat:    "bg-charcoal border border-steel border-t-2 border-t-gold overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.4)]",
  ghost:   "bg-transparent border border-steel/50",
};

// ── CARD ROOT ─────────────────────────────────────────────────
export function Card({
  variant   = "default",
  hoverable = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "relative",
        variantStyles[variant],
        hoverable && [
          "cursor-pointer transition-[border-color,background] duration-[220ms]",
          "hover:border-slate hover:bg-gunmetal",
        ],
        className,
      )}
      {...props}
    >
      {/* Chevron pattern overlay for stat cards */}
      {variant === "stat" && (
        <div
          className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent 0px, transparent 8px,
              rgba(245,193,0,0.03) 8px, rgba(245,193,0,0.03) 9px
            )`,
          }}
        />
      )}
      {children}
    </div>
  );
}

// ── CARD HEADER ───────────────────────────────────────────────
export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn("bg-gunmetal px-5 py-4 border-b border-steel", className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ── CARD BODY ─────────────────────────────────────────────────
export function CardBody({ className, children, ...props }: CardHeaderProps) {
  return (
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
}

// ── CARD TITLE ────────────────────────────────────────────────
export function CardTitle({
  as: Tag = "h3",
  className,
  children,
  ...props
}: CardTitleProps) {
  return (
    <Tag
      className={cn(
        "font-display text-[22px] tracking-[0.05em] text-white leading-none",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

// ── CARD LABEL ────────────────────────────────────────────────
export function CardLabel({ className, children, ...props }: CardHeaderProps) {
  return (
    <p
      className={cn(
        "font-mono text-[10px] tracking-[0.14em] uppercase text-muted mb-1.5",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

// ── STAT CARD (compound) ─────────────────────────────────────
interface StatCardProps {
  label:     string;
  value:     string | number;
  delta?:    string;
  deltaDir?: "up" | "down" | "neutral";
  accent?:   "gold" | "danger";
  className?: string;
}

export function StatCard({ label, value, delta, deltaDir = "neutral", accent = "gold", className }: StatCardProps) {
  const deltaColor = {
    up:      "text-success",
    down:    "text-danger",
    neutral: "text-muted",
  }[deltaDir];

  const valueColor = accent === "danger" ? "text-danger" : "text-gold";

  return (
    <Card variant="stat" className={cn("p-5", className)}>
      <CardLabel>{label}</CardLabel>
      <p className={cn("font-display text-[48px] leading-none tracking-[0.02em] animate-count-up", valueColor)}>
        {value}
      </p>
      {delta && (
        <p className={cn("text-[12px] mt-1", deltaColor)}>{delta}</p>
      )}
    </Card>
  );
}
