"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxPulse, OxFile, OxHeart, OxHelp, OxCheck, OxClock } from "@/components/icons/OxIcons";

const reasons = [
  { id: "progress", label: "Track Progress", icon: OxPulse, description: "Measure changes in body composition" },
  { id: "program", label: "New Program", icon: OxFile, description: "Starting a new training program" },
  { id: "health", label: "Health Check", icon: OxHeart, description: "Routine health assessment" },
  { id: "other", label: "Other", icon: OxHelp, description: "Something else" },
];

const previousRequests = [
  { date: "Mar 10, 2026", reason: "Track Progress", status: "Completed" },
  { date: "Jan 22, 2026", reason: "New Program", status: "Completed" },
  { date: "Dec 5, 2025", reason: "Health Check", status: "Pending" },
];

export default function InbodyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => setSubmitted(true);
  const handleReset = () => { setCurrentStep(1); setSelectedReason(null); setNote(""); setSubmitted(false); };

  return (
    <div className="min-h-full pb-28 lg:pb-10">
      <div className="max-w-lg mx-auto px-5 pt-14 lg:pt-10">
        <BackArrow href="/portal/more" />
        <h1 className="text-white font-display text-[32px] tracking-wider leading-none mb-1">INBODY REQUEST</h1>
        <p className="text-white/35 text-[14px] mb-6">Request a body composition scan</p>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-md flex items-center justify-center text-[13px] font-bold transition-all", currentStep >= step ? "bg-gold text-void" : "bg-white/[0.06] text-white/20")}>
                {submitted && step === 3 ? <OxCheck size={14} /> : step}
              </div>
              {step < 3 && <div className={cn("w-10 h-[2px] rounded-full transition-colors", currentStep > step ? "bg-gold" : "bg-white/[0.06]")} />}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {currentStep === 1 && (
          <div>
            <p className="text-white text-[17px] font-semibold mb-4">Why do you need a scan?</p>
            <div className="space-y-3">
              {reasons.map((reason) => {
                const Icon = reason.icon;
                return (
                  <button key={reason.id} onClick={() => setSelectedReason(reason.id)} className={cn("w-full rounded-lg border p-4 flex items-center gap-4 text-left transition-all duration-200", selectedReason === reason.id ? "bg-gold/[0.06] border-gold/20" : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]")} style={{ minHeight: "64px" }}>
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", selectedReason === reason.id ? "bg-gold/15" : "bg-white/[0.06]")}>
                      <Icon size={18} className={selectedReason === reason.id ? "text-gold" : "text-white/30"} />
                    </div>
                    <div><p className="text-white text-[15px] font-medium">{reason.label}</p><p className="text-white/30 text-[13px] mt-0.5">{reason.description}</p></div>
                  </button>
                );
              })}
            </div>
            <button disabled={!selectedReason} onClick={() => setCurrentStep(2)} className={cn("mt-6 w-full bg-gold hover:bg-gold-high text-void font-bold text-[16px] py-4 rounded-lg transition-all", !selectedReason && "opacity-30 cursor-not-allowed")} style={{ minHeight: "56px" }}>NEXT</button>
          </div>
        )}

        {/* Step 2 */}
        {currentStep === 2 && (
          <div>
            <p className="text-white text-[17px] font-semibold mb-4">Add a note (optional)</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any details for your trainer..." className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg p-4 text-[15px] text-white placeholder:text-white/20 resize-none h-32 focus:outline-none focus:border-gold/30 transition" />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCurrentStep(1)} className="flex-1 bg-white/[0.06] hover:bg-white/[0.10] text-white font-semibold text-[16px] py-4 rounded-lg transition-colors" style={{ minHeight: "56px" }}>Back</button>
              <button onClick={() => setCurrentStep(3)} className="flex-1 bg-gold hover:bg-gold-high text-void font-bold text-[16px] py-4 rounded-lg transition-colors" style={{ minHeight: "56px" }}>NEXT</button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {currentStep === 3 && !submitted && (
          <div>
            <p className="text-white text-[17px] font-semibold mb-4">Confirm your request</p>
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-5 space-y-4">
              <div><p className="text-gold/50 text-[11px] font-bold uppercase tracking-[0.15em]">Reason</p><p className="text-white text-[16px] mt-1">{reasons.find((r) => r.id === selectedReason)?.label}</p></div>
              {note && <div><p className="text-gold/50 text-[11px] font-bold uppercase tracking-[0.15em]">Note</p><p className="text-white/60 text-[14px] mt-1">{note}</p></div>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCurrentStep(2)} className="flex-1 bg-white/[0.06] hover:bg-white/[0.10] text-white font-semibold text-[16px] py-4 rounded-lg transition-colors" style={{ minHeight: "56px" }}>Back</button>
              <button onClick={handleSubmit} className="flex-1 bg-gold hover:bg-gold-high text-void font-bold text-[16px] py-4 rounded-lg transition-colors" style={{ minHeight: "56px" }}>SUBMIT</button>
            </div>
          </div>
        )}

        {/* Success */}
        {currentStep === 3 && submitted && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-5"><OxCheck size={28} className="text-gold" /></div>
            <h2 className="text-white font-display text-[28px] tracking-wider">REQUEST SUBMITTED</h2>
            <p className="text-white/40 text-[15px] mt-2">You&apos;ll be notified when your scan is scheduled.</p>
            <button onClick={handleReset} className="mt-6 bg-white/[0.06] hover:bg-white/[0.10] text-white font-semibold text-[15px] px-6 py-3.5 rounded-lg transition-colors">New Request</button>
          </div>
        )}

        {/* Previous requests */}
        <div className="mt-12">
          <p className="text-gold/50 text-[11px] font-bold uppercase tracking-[0.15em] mb-3 px-1">Previous Requests</p>
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
            {previousRequests.map((req, i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0"><OxClock size={16} className="text-white/25" /></div>
                  <div><p className="text-white text-[15px] font-medium">{req.reason}</p><p className="text-white/30 text-[12px] mt-0.5">{req.date}</p></div>
                </div>
                <span className={cn("text-[11px] font-bold px-3 py-1 rounded-sm", req.status === "Completed" ? "bg-success/[0.12] text-success" : "bg-gold/10 text-gold")}>{req.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
