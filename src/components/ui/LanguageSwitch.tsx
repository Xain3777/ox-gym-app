"use client";

import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ── LANGUAGE TOGGLE ─────────────────────────────────────────────
// Compact EN | AR switch for sidebar and header.

export function LanguageSwitch({ className }: { className?: string }) {
  const { locale, setLocale } = useTranslation();

  return (
    <div
      className={cn(
        "inline-flex items-center border border-steel overflow-hidden",
        className,
      )}
    >
      <button
        onClick={() => setLocale("en")}
        className={cn(
          "px-2.5 py-1 font-mono text-[9px] tracking-[0.12em] uppercase transition-colors duration-fast",
          locale === "en"
            ? "bg-gold text-void font-bold"
            : "bg-charcoal text-muted hover:text-offwhite",
        )}
      >
        EN
      </button>
      <button
        onClick={() => setLocale("ar")}
        className={cn(
          "px-2.5 py-1 font-mono text-[9px] tracking-[0.12em] uppercase transition-colors duration-fast",
          locale === "ar"
            ? "bg-gold text-void font-bold"
            : "bg-charcoal text-muted hover:text-offwhite",
        )}
      >
        AR
      </button>
    </div>
  );
}
