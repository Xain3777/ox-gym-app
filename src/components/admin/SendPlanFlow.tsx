"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Send, ChevronRight, User, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/Badge";
import { StripeDivider } from "@/components/layout/TopBar";
import { cn, getMemberStatus, formatDate } from "@/lib/utils";
import type { MemberWithSub, WorkoutPlan } from "@/types";

type Step = 1 | 2 | 3;

// ── COMPONENT ─────────────────────────────────────────────────
export function SendPlanFlow({
  members,
  plans,
}: {
  members: MemberWithSub[];
  plans:   WorkoutPlan[];
}) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { success, error: toastError } = useToast();

  const [step,             setStep]     = useState<Step>(1);
  const [selectedMember,   setMember]   = useState<MemberWithSub | null>(null);
  const [selectedPlan,     setPlan]     = useState<WorkoutPlan | null>(null);
  const [sending,          setSending]  = useState(false);
  const [sent,             setSent]     = useState(false);
  const [memberSearch,     setMSearch]  = useState("");
  const [planSearch,       setPSearch]  = useState("");

  // Pre-select member from query param ?member=<id>
  useEffect(() => {
    const memberId = searchParams.get("member");
    if (memberId) {
      const found = members.find((m) => m.id === memberId);
      if (found) {
        setMember(found);
        setStep(2);
      }
    }
  }, [searchParams, members]);

  // ── FILTERED LISTS ────────────────────────────────────────
  const filteredMembers = members.filter((m) => {
    const q = memberSearch.toLowerCase();
    return m.full_name.toLowerCase().includes(q)
      || (m.username?.toLowerCase().includes(q) ?? false)
      || (m.phone?.toLowerCase().includes(q) ?? false);
  });

  const filteredPlans = plans.filter((p) =>
    p.name.toLowerCase().includes(planSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(planSearch.toLowerCase()),
  );

  // ── SEND ──────────────────────────────────────────────────
  async function handleSend() {
    if (!selectedMember || !selectedPlan) return;
    setSending(true);
    try {
      const res = await fetch("/api/send-plan", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          member_id: selectedMember.id,
          plan_id:   selectedPlan.id,
          plan_type: "workout",
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toastError("Send failed", data.error ?? "Please try again.");
        return;
      }

      setSent(true);
      success(
        "Plan sent!",
        `${selectedPlan.name} sent to ${selectedMember.full_name}`,
      );

      // Auto-navigate back after 2.5 s
      setTimeout(() => {
        router.push(`/members/${selectedMember.id}`);
        router.refresh();
      }, 2500);
    } catch {
      toastError("Network error", "Check connection and try again.");
    } finally {
      setSending(false);
    }
  }

  // ── SUCCESS SCREEN ────────────────────────────────────────
  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
        <div className="w-16 h-16 bg-gold/10 border border-gold/30 flex items-center justify-center">
          <Check size={32} className="text-gold" />
        </div>
        <div>
          <p className="font-display text-[40px] tracking-[0.04em] text-white leading-none mb-2">
            PLAN SENT
          </p>
          <p className="text-[14px] text-muted">
            {selectedPlan?.name} → {selectedMember?.full_name}
          </p>
        </div>
        <p className="text-[12px] text-slate">Redirecting to member profile...</p>
      </div>
    );
  }

  // ── STEP INDICATORS ───────────────────────────────────────
  const steps = [
    { num: 1, label: "Member" },
    { num: 2, label: "Plan"   },
    { num: 3, label: "Send"   },
  ];

  return (
    <div className="max-w-[720px]">

      {/* Step indicators */}
      <div className="flex items-center gap-0 mb-8">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <button
              onClick={() => {
                if (s.num < step) setStep(s.num as Step);
              }}
              disabled={s.num > step}
              className={cn(
                "flex items-center gap-2 px-4 py-2",
                "font-mono text-[10px] tracking-[0.12em] uppercase",
                "transition-colors duration-[120ms]",
                "disabled:cursor-not-allowed",
                step === s.num
                  ? "text-gold"
                  : s.num < step
                  ? "text-muted hover:text-offwhite cursor-pointer"
                  : "text-steel cursor-not-allowed",
              )}
            >
              <span
                className={cn(
                  "w-5 h-5 flex items-center justify-center text-[10px] font-bold border",
                  step === s.num
                    ? "border-gold text-gold"
                    : s.num < step
                    ? "border-steel bg-steel/20 text-muted"
                    : "border-steel/40 text-steel/40",
                )}
              >
                {s.num < step ? <Check size={10} /> : s.num}
              </span>
              {s.label}
            </button>
            {i < steps.length - 1 && (
              <ChevronRight size={12} className="text-steel mx-1" />
            )}
          </div>
        ))}
      </div>

      <StripeDivider thin />
      <div className="mt-6">

        {/* ── STEP 1: SELECT MEMBER ── */}
        {step === 1 && (
          <div>
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-gold mb-4">
              Select Member
            </p>

            {/* Search */}
            <input
              type="text"
              placeholder="Search by name or email..."
              value={memberSearch}
              onChange={(e) => setMSearch(e.target.value)}
              className="w-full bg-charcoal border border-steel border-b-slate text-offwhite text-[14px] px-4 h-[44px] outline-none focus:border-gold focus:bg-iron transition-colors placeholder:text-slate mb-3"
            />

            {/* Member list */}
            <div className="space-y-[2px] max-h-[400px] overflow-y-auto">
              {filteredMembers.length === 0 ? (
                <p className="text-muted text-[13px] py-8 text-center">No members found.</p>
              ) : (
                filteredMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setMember(m); setStep(2); }}
                    className="w-full flex items-center gap-4 px-5 py-4 bg-iron border border-steel hover:border-gold/40 hover:bg-gunmetal transition-[border-color,background] text-left group"
                  >
                    <Avatar name={m.full_name} photoUrl={m.photo_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-white truncate">{m.full_name}</p>
                      <p className="text-[12px] text-muted truncate">{m.phone ?? m.username ?? ""}</p>
                    </div>
                    <StatusBadge status={getMemberStatus(m.subscription?.end_date ?? null)} />
                    <ChevronRight size={14} className="text-steel group-hover:text-gold transition-colors flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: SELECT PLAN ── */}
        {step === 2 && (
          <div>
            {/* Selected member summary */}
            {selectedMember && (
              <div className="flex items-center gap-3 p-3 bg-iron border-l-2 border-gold mb-5">
                <Avatar name={selectedMember.full_name} size="sm" />
                <div>
                  <p className="text-[13px] font-medium text-white">{selectedMember.full_name}</p>
                  <p className="text-[11px] text-muted">{selectedMember.phone ?? selectedMember.username ?? ""}</p>
                </div>
                <button
                  onClick={() => { setMember(null); setStep(1); }}
                  className="ml-auto font-mono text-[9px] uppercase tracking-[0.1em] text-slate hover:text-gold transition-colors"
                >
                  Change
                </button>
              </div>
            )}

            <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-gold mb-4">
              Select Workout Plan
            </p>

            <input
              type="text"
              placeholder="Search plans..."
              value={planSearch}
              onChange={(e) => setPSearch(e.target.value)}
              className="w-full bg-charcoal border border-steel border-b-slate text-offwhite text-[14px] px-4 h-[44px] outline-none focus:border-gold focus:bg-iron transition-colors placeholder:text-slate mb-3"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
              {filteredPlans.length === 0 ? (
                <p className="text-muted text-[13px] py-8 text-center col-span-2">No plans found.</p>
              ) : (
                filteredPlans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setPlan(p); setStep(3); }}
                    className={cn(
                      "flex flex-col items-start text-left p-4",
                      "bg-iron border transition-[border-color,background] duration-[220ms]",
                      selectedPlan?.id === p.id
                        ? "border-gold bg-gold/5"
                        : "border-steel hover:border-gold/40 hover:bg-gunmetal",
                    )}
                  >
                    <div className="flex items-start justify-between w-full gap-2 mb-2">
                      <p className="font-display text-[18px] tracking-[0.05em] text-white leading-tight">
                        {p.name}
                      </p>
                      {selectedPlan?.id === p.id && (
                        <Check size={14} className="text-gold flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                    <p className="text-[12px] text-muted mb-2">{p.category}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {[p.level, `${p.duration_weeks}w`, `${p.content?.length ?? 0} days`].map((tag) => (
                        <span key={tag} className="font-mono text-[9px] uppercase tracking-[0.08em] px-2 py-0.5 border border-steel text-ghost">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: CONFIRM & SEND ── */}
        {step === 3 && selectedMember && selectedPlan && (
          <div>
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-gold mb-5">
              Confirm Send
            </p>

            {/* Summary card */}
            <div className="bg-iron border border-steel border-t-2 border-t-gold p-5 mb-6 space-y-4">

              {/* Member */}
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted mb-2">
                  Recipient
                </p>
                <div className="flex items-center gap-3">
                  <Avatar name={selectedMember.full_name} size="md" />
                  <div>
                    <p className="font-semibold text-[14px] text-white">{selectedMember.full_name}</p>
                    <p className="text-[12px] text-muted">{selectedMember.phone ?? selectedMember.username ?? ""}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-steel" />

              {/* Plan */}
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted mb-2">
                  Plan
                </p>
                <p className="font-display text-[24px] tracking-[0.04em] text-white leading-none mb-1">
                  {selectedPlan.name}
                </p>
                <p className="text-[13px] text-muted">
                  {selectedPlan.category} · {selectedPlan.level} · {selectedPlan.duration_weeks} weeks
                </p>
              </div>

              <div className="border-t border-steel" />

              {/* Delivery note — outbound channel pending */}
              <div className="text-[12px] text-muted bg-charcoal p-3 border border-steel/50">
                The plan will be saved to{" "}
                <span className="text-gold">{selectedMember.full_name}</span>&rsquo;s
                portal. Outbound notifications will go out once the SMS / email
                channel is wired up.
              </div>
            </div>

            {/* Action row */}
            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setStep(2)}
              >
                ← Back
              </Button>
              <Button
                size="lg"
                fullWidth
                loading={sending}
                onClick={handleSend}
              >
                <Send size={15} />
                {sending ? "Sending..." : "SEND PLAN"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
