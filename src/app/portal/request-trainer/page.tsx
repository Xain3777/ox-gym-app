"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxCheck, OxUserPlus } from "@/components/icons/OxIcons";

const changeReasons = [
  { id: "support", label: "Need more support", description: "Looking for a trainer with more availability" },
  { id: "specialist", label: "Looking for specialist", description: "Need expertise in a specific area" },
  { id: "not-satisfied", label: "Not satisfied", description: "Current experience isn't meeting expectations" },
  { id: "other", label: "Other", description: "A different reason" },
];

export default function RequestTrainerPage() {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="min-h-full pb-28 lg:pb-10">
        <div className="max-w-lg mx-auto px-5 pt-14 lg:pt-10">
          <BackArrow href="/portal/trainer" />
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-5"><OxCheck size={28} className="text-gold" /></div>
            <h2 className="text-white font-display text-[28px] tracking-wider">REQUEST SUBMITTED</h2>
            <p className="text-white/40 text-[15px] mt-2 max-w-sm mx-auto">Our team will review your request and get back to you within 24-48 hours.</p>
            <button onClick={() => { setSubmitted(false); setSelectedReason(null); setFeedbackText(""); }} className="mt-6 bg-white/[0.06] hover:bg-white/[0.10] text-white font-semibold text-[15px] px-6 py-3.5 rounded-lg transition-colors">Cancel Request</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-28 lg:pb-10">
      <div className="max-w-lg mx-auto px-5 pt-14 lg:pt-10">
        <BackArrow href="/portal/trainer" />
        <h1 className="text-white font-display text-[32px] tracking-wider leading-none mb-1">REQUEST TRAINER</h1>
        <p className="text-white/35 text-[14px] mb-6">Change your trainer or get a specialist</p>

        {/* Current trainer */}
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
            <span className="text-gold text-[15px] font-bold">CA</span>
          </div>
          <div>
            <p className="text-gold/50 text-[11px] font-bold uppercase tracking-[0.15em]">Current Trainer</p>
            <p className="text-white text-[16px] font-semibold mt-0.5">Coach Ahmed</p>
          </div>
        </div>

        {/* Reason selection */}
        <p className="text-white text-[17px] font-semibold mb-4">Why do you want a new trainer?</p>
        <div className="space-y-3 mb-6">
          {changeReasons.map((reason) => (
            <button key={reason.id} onClick={() => setSelectedReason(reason.id)} className={cn("w-full rounded-lg border p-4 text-left transition-all duration-200", selectedReason === reason.id ? "bg-gold/[0.06] border-gold/20" : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]")} style={{ minHeight: "64px" }}>
              <p className="text-white text-[15px] font-medium">{reason.label}</p>
              <p className="text-white/30 text-[13px] mt-0.5">{reason.description}</p>
            </button>
          ))}
        </div>

        {selectedReason === "not-satisfied" && (
          <div className="mb-6">
            <p className="text-gold text-[13px] font-medium mb-2">Tell us what went wrong</p>
            <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Share your feedback..." className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg p-4 text-[15px] text-white placeholder:text-white/20 resize-none h-28 focus:outline-none focus:border-gold/30 transition" />
          </div>
        )}

        {/* Preference */}
        <p className="text-gold/50 text-[11px] font-bold uppercase tracking-[0.15em] mb-3 px-1">Preference</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 text-left hover:bg-white/[0.05] transition-all">
            <OxUserPlus size={18} className="text-gold mb-2" />
            <p className="text-white text-[14px] font-medium">Recommend</p>
            <p className="text-white/30 text-[12px] mt-1">Best match for you</p>
          </button>
          <button className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 text-left hover:bg-white/[0.05] transition-all">
            <OxUserPlus size={18} className="text-danger mb-2" />
            <p className="text-white text-[14px] font-medium">Auto Assign</p>
            <p className="text-white/30 text-[12px] mt-1">Next available</p>
          </button>
        </div>

        <button disabled={!selectedReason} onClick={() => setSubmitted(true)} className={cn("w-full bg-gold hover:bg-gold-high text-void font-bold text-[16px] py-4 rounded-lg transition-all duration-200", !selectedReason && "opacity-30 cursor-not-allowed")} style={{ minHeight: "56px" }}>
          SUBMIT REQUEST
        </button>
      </div>
    </div>
  );
}
