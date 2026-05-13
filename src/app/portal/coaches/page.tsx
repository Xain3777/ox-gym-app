"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxTrainer, OxAward } from "@/components/icons/OxIcons";
import { COACHES_AR, type CoachAr } from "@/data/coaches";

// ═══════════════════════════════════════════════════════════════
// OX GYM — Coaches Page (Arabic)
//
// Mobile-first 2-column grid. The head coach (role === "head_coach")
// always renders first and spans both columns with a featured gold
// border + glow. Coach photos are served from /public/coaches/ — see
// public/coaches/README.md for expected filenames. Missing files fall
// back to a "صورة المدرب" placeholder so no broken-image icons appear.
// ═══════════════════════════════════════════════════════════════

export default function CoachesPage() {
  return (
    <div className="min-h-full pb-28 lg:pb-10" dir="rtl">

      {/* ── Hero ───────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden bg-[#0a0a0a]" style={{ height: 200 }}>
        <div
          className="absolute top-0 left-0 right-0 h-[6px] z-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg,#F5C100 0,#F5C100 14px,#0a0a0a 14px,#0a0a0a 28px)",
            opacity: 0.9,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg,transparent 0,transparent 28px,rgba(245,193,0,0.03) 28px,rgba(245,193,0,0.03) 30px)",
          }}
        />
        <div className="absolute bottom-8 left-0 right-0 z-10 px-5" dir="rtl">
          <BackArrow href="/portal/more" className="mb-2" />
          <p className="font-display text-[34px] leading-none tracking-wider text-gold">فريق المدربين</p>
          <p className="text-white/40 text-[13px] mt-1">تعرّف على فريق المدربين في OX GYM</p>
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-[5px] z-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg,#F5C100 0,#F5C100 14px,transparent 14px,transparent 28px)",
            opacity: 0.4,
          }}
        />
      </div>

      <div className="max-w-lg mx-auto px-5 pt-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {COACHES_AR.map((coach) => (
            <CoachCard key={coach.name} coach={coach} />
          ))}
        </div>

        <p className="text-center text-white/15 text-[12px] pt-6">OX GYM · فريق التدريب</p>
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────
function CoachCard({ coach }: { coach: CoachAr }) {
  const isHead = coach.role === "head_coach";
  const fullTitle = `${coach.title} ${coach.name}`;

  return (
    <article
      className={cn(
        "rounded-2xl border bg-void/80 overflow-hidden flex flex-col",
        isHead
          ? "border-2 border-gold shadow-[0_0_22px_rgba(245,188,0,0.22)]"
          : "border-gold/15"
      )}
    >
      {/* Photo */}
      <div className="relative">
        <CoachImage src={coach.image} alt={fullTitle} />
        {isHead && (
          <span className="absolute top-2 right-2 inline-block text-[10px] font-bold px-2 py-1 bg-gold text-void border border-gold shadow-md tracking-wide">
            الهيد كوتش
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 p-3">
        <p
          className={cn(
            "text-white font-display tracking-wider leading-tight",
            isHead ? "text-[17px]" : "text-[15px]"
          )}
        >
          {fullTitle}
        </p>

        <dl className="mt-3 space-y-1.5">
          <Field
            label="التخصص"
            value={coach.specialty.length > 0 ? coach.specialty.join("، ") : "سيتم التحديث قريباً"}
            compact
          />
          <Field label="الخبرة" value={coach.experience} compact />
          <Field label="الدراسة" value={coach.education} compact />
        </dl>

        {coach.achievements.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <OxAward size={11} className="text-gold" />
              <p className="text-gold/70 font-bold uppercase tracking-[0.15em] text-[9px]">
                الإنجازات
              </p>
            </div>
            <ul className="space-y-1">
              {coach.achievements.map((ach) => (
                <li
                  key={ach}
                  className="text-white/70 leading-snug flex gap-1.5 text-[11.5px]"
                >
                  <span className="text-gold flex-shrink-0">•</span>
                  <span>{ach}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}

// ── Photo block with graceful fallback ────────────────────────
// next/image fires onError when the file 404s — we swap to a clean
// dark/gold placeholder so the user never sees a broken-image icon.
function CoachImage({ src, alt }: { src: string; alt: string }) {
  const [errored, setErrored] = useState(false);

  if (errored || !src) {
    return <CoachImagePlaceholder />;
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 50vw, 360px"
        className="object-cover"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

function CoachImagePlaceholder() {
  return (
    <div
      className="relative aspect-square w-full flex flex-col items-center justify-center gap-2 bg-[#0d0d0d] overflow-hidden"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg,transparent 0,transparent 18px,rgba(245,193,0,0.04) 18px,rgba(245,193,0,0.04) 20px)",
      }}
    >
      <div className="w-12 h-12 bg-gold/10 border border-gold/25 flex items-center justify-center">
        <OxTrainer size={22} className="text-gold/70" />
      </div>
      <p className="text-white/45 text-[11px] tracking-wide">صورة المدرب</p>
    </div>
  );
}

// ── Field row ─────────────────────────────────────────────────
function Field({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-2", compact ? "gap-2" : "gap-4")}>
      <span className={cn("text-white/40 shrink-0", compact ? "text-[10.5px]" : "text-[12px]")}>
        {label}
      </span>
      <span
        className={cn(
          "text-white/85 font-medium text-left flex-1 truncate",
          compact ? "text-[11.5px]" : "text-[14px]"
        )}
        dir="rtl"
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
