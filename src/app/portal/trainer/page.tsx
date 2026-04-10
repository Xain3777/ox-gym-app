"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxMessage, OxStar, OxUsers, OxChevronRight } from "@/components/icons/OxIcons";

export default function TrainerPage() {
  return (
    <div className="min-h-full pb-28 lg:pb-10">
      <div className="max-w-lg mx-auto px-5 pt-14 lg:pt-10">
        <BackArrow href="/portal/more" />

        <h1 className="text-white font-display text-[32px] tracking-wider leading-none mb-6">MY TRAINER</h1>

        {/* Trainer Profile Card */}
        <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-6 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
              <span className="text-gold text-[20px] font-bold">CA</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white text-[20px] font-bold">Coach Ahmed</h2>
              <p className="text-gold text-[14px] font-medium mt-0.5">Strength & Conditioning</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <OxStar key={star} size={14} className={cn(star <= 4 ? "text-gold" : "text-gold/30")} />
                  ))}
                  <span className="text-white/40 text-[13px] ml-1">4.8</span>
                </div>
                <span className="text-white/20">·</span>
                <span className="text-white/35 text-[13px] flex items-center gap-1">
                  <OxUsers size={12} /> 12 clients
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/portal/messages"
            className="mt-5 flex items-center justify-center gap-2 w-full bg-gold hover:bg-gold-high active:bg-gold-deep text-void font-bold text-[16px] py-4 rounded-lg transition-all duration-200"
            style={{ minHeight: "56px" }}
          >
            <OxMessage size={18} />
            SEND MESSAGE
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { value: "3", label: "Months Together" },
            { value: "24", label: "Sessions Done" },
            { value: "4.8", label: "Your Rating" },
            { value: "2", label: "Plans Created" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 text-center">
              <p className="text-gold text-[24px] font-bold">{stat.value}</p>
              <p className="text-white/30 text-[12px] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Request New Trainer */}
        <Link
          href="/portal/request-trainer"
          className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 flex items-center gap-4 hover:bg-white/[0.05] active:scale-[0.98] transition-all duration-200"
          style={{ minHeight: "64px" }}
        >
          <div className="w-10 h-10 rounded-lg bg-danger/[0.08] flex items-center justify-center flex-shrink-0">
            <OxUsers size={18} className="text-danger" />
          </div>
          <div className="flex-1">
            <p className="text-white text-[16px] font-medium">Request Trainer</p>
            <p className="text-white/35 text-[13px] mt-0.5">Change your trainer or get a specialist</p>
          </div>
          <OxChevronRight size={16} className="text-gold/30" />
        </Link>
      </div>
    </div>
  );
}
