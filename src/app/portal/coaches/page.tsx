"use client";

import { BackArrow } from "@/components/portal/BackArrow";
import { OxTrainer, OxAward } from "@/components/icons/OxIcons";
import { COACHES_AR } from "@/data/coaches";

// ═══════════════════════════════════════════════════════════════
// OX GYM — Coaches Page (Arabic)
//
// Mobile-first roster of the gym's coaching team. Reachable from the
// portal "More" page (فريق المدربين section) and from the gym-info
// breadcrumbs.
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

      <div className="max-w-lg mx-auto px-5 pt-8 space-y-4">
        {COACHES_AR.map((coach) => (
          <article
            key={coach.name}
            className="border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-5"
          >
            {/* Header — name + title badge */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                  <OxTrainer size={20} className="text-gold" />
                </div>
                <div className="min-w-0">
                  <p className="text-gold/50 text-[10px] font-bold uppercase tracking-[0.12em]">الاسم</p>
                  <p className="text-white font-display text-[22px] tracking-wider leading-none mt-1 truncate">
                    {coach.name}
                  </p>
                </div>
              </div>
              <span className="inline-block text-[11px] font-bold px-2.5 py-1 bg-gold/15 text-gold border border-gold/25 shrink-0">
                {coach.title}
              </span>
            </div>

            {/* Body — fields stacked */}
            <dl className="space-y-3 text-[13.5px]">
              <Field label="التخصص" value={coach.specialty.join("، ")} />
              <Field label="الخبرة" value={coach.experience} />
              <Field label="الدراسة" value={coach.education} />
            </dl>

            {/* Achievements — only when present */}
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
          </article>
        ))}

        <p className="text-center text-white/15 text-[12px] pt-4">OX GYM · فريق التدريب</p>
      </div>
    </div>
  );
}

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
