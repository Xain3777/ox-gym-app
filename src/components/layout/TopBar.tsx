"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title:      string;
  eyebrow?:   string;
  actions?:   React.ReactNode;
  className?: string;
}

export function TopBar({ title, eyebrow, actions, className }: TopBarProps) {
  return (
    <header
      className={cn(
        "relative",
        "flex items-center justify-between",
        "px-5 sm:px-8 py-4 sm:py-6 border-b border-steel",
        "bg-charcoal",
        className,
      )}
    >
      {/* Left: OX logo + GYM text + page title */}
      <div className="flex items-center gap-3 sm:gap-5 min-w-0 flex-1">
        {/* OX brand mark — visible only on mobile (desktop has sidebar) */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 md:hidden">
          <Image
            src="/ox-logo.png"
            alt="OX GYM"
            width={36}
            height={36}
            className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9"
            unoptimized
          />
          <span className="font-display text-[22px] tracking-[0.06em] text-gold leading-none whitespace-nowrap">
            GYM
          </span>
        </div>

        {/* Divider between brand and page title (mobile only) */}
        <div className="block md:hidden w-px h-8 bg-steel flex-shrink-0" />

        {/* Page title */}
        <div className="min-w-0">
          {eyebrow && (
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-gold/60 mb-1.5">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-[24px] sm:text-[30px] tracking-[0.04em] text-white leading-none truncate">
            {title}
          </h1>
        </div>
      </div>

      {/* Right: Actions only */}
      {actions && (
        <div className="flex items-center gap-3 flex-shrink-0">
          {actions}
        </div>
      )}

      {/* Red energy line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 ox-stripe-red" />
    </header>
  );
}

// ── PAGE SECTION HEADER ───────────────────────────────────────
// Used within page content to label sub-sections
interface SectionHeaderProps {
  label:      string;
  children?:  React.ReactNode;
  className?: string;
}

export function SectionHeader({ label, children, className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between mb-4",
        className,
      )}
    >
      <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted">
        {label}
      </p>
      {children}
    </div>
  );
}

// ── HAZARD STRIPE DIVIDER ─────────────────────────────────────
export function StripeDivider({ thin = false }: { thin?: boolean }) {
  return (
    <div
      className={cn(thin ? "h-1" : "h-2", "w-full")}
      style={{
        backgroundImage: `repeating-linear-gradient(
          45deg,
          #F5C100 0px, #F5C100 ${thin ? "4px" : "8px"},
          transparent ${thin ? "4px" : "8px"}, transparent ${thin ? "8px" : "16px"}
        )`,
      }}
    />
  );
}

// ── LOADING BAR ───────────────────────────────────────────────
export function LoadingBar() {
  return <div className="ox-loading-bar w-full" />;
}
