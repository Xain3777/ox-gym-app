"use client";

import { useState } from "react";
import Image from "next/image";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxTrainer, OxAward } from "@/components/icons/OxIcons";
import { COACHES_AR, type CoachAr } from "@/data/coaches";

// ═══════════════════════════════════════════════════════════════
// OX GYM — Coaches Page (Arabic)
//
// Mobile-first roster. Coach photos are served from /public/coaches/
// (see public/coaches/README.md for expected filenames). Missing or
// broken images fall back to a clean "صورة المدرب" placeholder so the
// UI never shows a broken-image icon.
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

      <div className="max-w-lg mx-auto px-5 pt-8 space-y-5">
        {COACHES_AR.map((coach) => (
          <CoachCard key={coach.name} coach={coach} />
        ))}

        <p className="text-center text-white/15 text-[12px] pt-4">OX GYM · فريق التدريب</p>
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────
function CoachCard({ coach }: { coach: CoachAr }) {
  return (
    <article className="border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors overflow-hidden rounded-xl">
      {/* Photo */}
      <CoachImage src={coach.image} alt={coach.name} />

      <div className="p-5">
        {/* Name + title */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-gold/50 text-[10px] font-bold uppercase tracking-[0.12em]">الاسم</p>
            <p className="text-white font-display text-[24px] tracking-wider leading-none mt-1 truncate">
              {coach.name}
            </p>
          </div>
          <span className="inline-block text-[11px] font-bold px-2.5 py-1 bg-gold/15 text-gold border border-gold/25 shrink-0">
            {coach.title}
          </span>
        </div>

        <dl className="space-y-3 text-[13.5px]">
          <Field label="التخصص" value={coach.specialty.join("، ")} />
          <Field label="الخبرة" value={coach.experience} />
          <Field label="الدراسة" value={coach.education} />
        </dl>

        {coach.achievements.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <OxAward size={14} className="text-gold" />
              <p className="text-gold/70 text-[10px] font-bold uppercase tracking-[0.15em]">الإنجازات</p>
            </div>
            <ul className="space-y-1.5">
              {coach.achievements.map((ach) => (
                <li key={ach} className="text-white/70 text-[13.5px] leading-relaxed flex gap-2">
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
    <div className="relative aspect-square w-full bg-[#0d0d0d] border-b border-gold/15 overflow-hidden">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, 512px"
        className="object-cover"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

function CoachImagePlaceholder() {
  return (
    <div
      className="relative aspect-square w-full flex flex-col items-center justify-center gap-2 bg-[#0d0d0d] border-b border-gold/15 overflow-hidden"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg,transparent 0,transparent 18px,rgba(245,193,0,0.04) 18px,rgba(245,193,0,0.04) 20px)",
      }}
    >
      <div className="w-14 h-14 bg-gold/10 border border-gold/25 flex items-center justify-center">
        <OxTrainer size={26} className="text-gold/70" />
      </div>
      <p className="text-white/45 text-[12px] tracking-wide">صورة المدرب</p>
    </div>
  );
}

// ── Field row ─────────────────────────────────────────────────
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-white/40 text-[12px] shrink-0">{label}</span>
      <span className="text-white/85 text-[14px] font-medium text-left flex-1" dir="rtl">
        {value}
      </span>
    </div>
  );
}
