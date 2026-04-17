"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxMessage, OxStar, OxUsers, OxChevronRight } from "@/components/icons/OxIcons";

export default function TrainerPage() {
  return (
    <div className="min-h-full pb-28 lg:pb-10" dir="rtl">
      <div className="max-w-lg mx-auto px-5 pt-14 lg:pt-10">
        <BackArrow href="/portal/more" />

        <h1 className="text-white font-display text-[32px] tracking-wider leading-none mb-1">المدرب الشخصي</h1>
        <p className="text-white/35 text-[14px] mb-6">متابعتك مع المدرب المخصص لك</p>

        {/* Trainer Profile Card */}
        <div className="bg-white/[0.04] border border-white/[0.06] p-6 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
              <span className="text-gold text-[20px] font-bold font-display">OX</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white text-[20px] font-bold">كوتش ادهم</h2>
              <p className="text-gold text-[14px] font-medium mt-0.5">القوة والتكييف البدني</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1" dir="ltr">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <OxStar key={star} size={14} className={cn(star <= 4 ? "text-gold" : "text-gold/30")} />
                  ))}
                  <span className="text-white/40 text-[13px] ml-1">4.8</span>
                </div>
                <span className="text-white/20">·</span>
                <span className="text-white/35 text-[13px] flex items-center gap-1">
                  <OxUsers size={12} /> ١٢ عميل
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/portal/messages"
            className="mt-5 flex items-center justify-center gap-2 w-full bg-gold hover:bg-gold-high active:bg-gold-deep text-void font-bold text-[16px] py-4 transition-all duration-200"
            style={{ minHeight: "56px" }}
          >
            <OxMessage size={18} />
            إرسال رسالة
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { value: "٣", label: "أشهر معاً" },
            { value: "٢٤", label: "جلسة منجزة" },
            { value: "4.8", label: "تقييمك" },
            { value: "٢", label: "برامج أُنشئت" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/[0.03] border border-white/[0.06] p-4 text-center">
              <p className="text-gold text-[24px] font-bold">{stat.value}</p>
              <p className="text-white/30 text-[12px] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Request Personal Trainer */}
        <Link
          href="/portal/request-trainer"
          className="bg-white/[0.03] border border-white/[0.06] p-4 flex items-center gap-4 hover:bg-white/[0.05] active:scale-[0.98] transition-all duration-200"
          style={{ minHeight: "64px" }}
        >
          <div className="w-10 h-10 bg-danger/[0.08] flex items-center justify-center flex-shrink-0">
            <OxUsers size={18} className="text-danger" />
          </div>
          <div className="flex-1">
            <p className="text-white text-[16px] font-medium">طلب مدرب شخصي</p>
            <p className="text-white/35 text-[13px] mt-0.5">غيّر مدربك أو اطلب متخصصاً</p>
          </div>
          <OxChevronRight size={16} className="text-gold/30 rotate-180" />
        </Link>
      </div>
    </div>
  );
}
