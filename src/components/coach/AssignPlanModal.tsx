"use client";

import { useEffect, useState } from "react";
import { X, Search, Send, User } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

// Modal: pick a player and POST /api/send-plan to insert a row in
// plan_sends. Used from the coach plans list. Reuses the existing
// assignment infrastructure — no new tables, no new endpoints.
export function AssignPlanModal({
  open,
  onClose,
  planId,
  planName,
  planType = "workout",
}: {
  open:      boolean;
  onClose:   () => void;
  planId:    string;
  planName:  string;
  planType?: "workout" | "meal";
}) {
  const { success, error: toastError } = useToast();
  const [search,    setSearch]    = useState("");
  const [members,   setMembers]   = useState<{ id: string; full_name: string; phone: string | null }[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setMembers([]);
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (search.trim().length < 2) {
      setMembers([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      const supabase = createBrowserSupabase();
      const q = search.trim();
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, phone")
        .eq("role", "player")
        .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(10);
      setLoading(false);
      if (error) {
        toastError("Search failed", error.message);
        return;
      }
      setMembers(data ?? []);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, open, toastError]);

  async function assign(memberId: string, memberName: string) {
    setAssigning(memberId);
    try {
      const res = await fetch("/api/send-plan", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ member_id: memberId, plan_id: planId, plan_type: planType }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toastError("Assign failed", data.error ?? "Please try again.");
        return;
      }
      success("Plan assigned", `${planName} → ${memberName}`);
      onClose();
    } catch {
      toastError("Network error", "Check connection and try again.");
    } finally {
      setAssigning(null);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-charcoal border border-white/[0.08] w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-white/[0.06]">
          <div className="min-w-0">
            <p className="text-white/40 text-[10px] font-mono uppercase tracking-wider mb-1">
              Assign Plan
            </p>
            <h3 className="text-white font-medium text-[15px] truncate">{planName}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="p-5 border-b border-white/[0.06]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone…"
              className="w-full h-10 pl-9 pr-3 bg-iron border border-steel text-white text-[13px] placeholder:text-white/25 focus:border-[#FF6B35]/50 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {search.trim().length < 2 ? (
            <p className="text-white/30 text-[13px] text-center py-10">
              Type at least 2 characters to search.
            </p>
          ) : loading ? (
            <p className="text-white/30 text-[13px] text-center py-10">Searching…</p>
          ) : members.length === 0 ? (
            <p className="text-white/30 text-[13px] text-center py-10">No players match.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-4">
                  <div className="w-9 h-9 bg-[#FF6B35]/10 flex items-center justify-center text-[#FF6B35] flex-shrink-0">
                    <User size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[13px] font-medium truncate">{m.full_name}</p>
                    {m.phone && <p className="text-white/40 text-[11px]">{m.phone}</p>}
                  </div>
                  <button
                    onClick={() => assign(m.id, m.full_name)}
                    disabled={assigning !== null}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors flex-shrink-0",
                      assigning === m.id
                        ? "bg-[#FF6B35]/30 text-[#FF6B35]/50"
                        : "bg-[#FF6B35] text-void hover:bg-[#FF6B35]/90 disabled:opacity-50",
                    )}
                  >
                    <Send size={12} />
                    {assigning === m.id ? "Sending…" : "Assign"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
