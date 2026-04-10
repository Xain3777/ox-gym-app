import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// ── TYPES ──────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "icon";
type ButtonSize    = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  loading?:   boolean;
  fullWidth?: boolean;
  children:   React.ReactNode;
}

// ── VARIANT STYLES ────────────────────────────────────────────
const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    // Gold fill, corner-cut shape, black text, red bottom edge on hover
    "bg-gold text-void font-display tracking-widest",
    "clip-corner-sm",                              // top-right corner cut
    "shadow-[inset_0_-2px_0_rgba(212,43,43,0)]",
    "hover:bg-gold-high hover:-translate-y-px hover:shadow-[inset_0_-3px_0_rgba(212,43,43,0.6)]",
    "active:scale-[0.98] active:translate-y-0",
    "disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none",
    "transition-[background,transform,box-shadow] duration-[120ms]",
  ].join(" "),

  secondary: [
    // Gold outline, transparent fill
    "bg-transparent text-gold font-display tracking-widest",
    "border border-gold",
    "hover:bg-gold/10",
    "active:scale-[0.98]",
    "disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none",
    "transition-[background,transform] duration-[120ms]",
  ].join(" "),

  ghost: [
    // Minimal — for tertiary actions
    "bg-transparent text-muted font-mono tracking-[0.14em] uppercase",
    "border border-steel",
    "hover:border-muted hover:text-offwhite",
    "active:scale-[0.98]",
    "disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none",
    "transition-[border-color,color] duration-[120ms]",
  ].join(" "),

  danger: [
    // Red — destructive actions only
    "bg-danger text-white font-display tracking-widest",
    "hover:bg-danger-deep",
    "active:scale-[0.98]",
    "disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none",
    "transition-[background,transform] duration-[120ms]",
  ].join(" "),

  icon: [
    // Square icon-only button
    "bg-iron text-muted",
    "border border-steel",
    "hover:border-gold hover:text-gold",
    "active:scale-[0.95]",
    "transition-[border-color,color] duration-[120ms]",
    "flex items-center justify-center",
  ].join(" "),
};

// ── SIZE STYLES ───────────────────────────────────────────────
const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-btn-sm px-5 text-[13px]",
  md: "h-btn-md px-6 text-[15px]",
  lg: "h-btn-lg px-7 text-[16px]",
  xl: "h-btn-xl px-9 text-[20px]",
};

const iconSizeStyles: Record<ButtonSize, string> = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-14 h-14",
};

// ── COMPONENT ─────────────────────────────────────────────────
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant   = "primary",
      size      = "lg",
      loading   = false,
      fullWidth = false,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isIcon  = variant === "icon";
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base
          "inline-flex items-center justify-center gap-2",
          "no-select whitespace-nowrap",
          // Variant
          variantStyles[variant],
          // Size
          isIcon ? iconSizeStyles[size] : sizeStyles[size],
          // Full width
          fullWidth && "w-full",
          // Loading state
          loading && "opacity-70 cursor-wait",
          className,
        )}
        {...props}
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
