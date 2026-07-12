"use client";

// ═══════════════════════════════════════════════════════════════
// Reception → Members — the main member list, now with management
// actions. Previously this page was read-only (edit/delete lived
// only in the buried Health page), which is why reception "couldn't
// edit or delete app accounts". Every action calls the existing
// audited /api/reception/* endpoints.
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/fetch-all";
import { getSubscriptionStatus } from "@/lib/subscription";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { Search, User, Pencil, KeyRound, Ban, Power, Trash2, X, Save, AlertCircle, RefreshCw, CalendarPlus } from "lucide-react";
import type { MemberWithSub, MemberStatus } from "@/types";

const RENDER_CAP = 150;

// Display status derives from the REAL subscription end date, not the
// stale members.status column (written once at creation). "suspended"
// is the only stored status that wins — it's set deliberately by staff.
function derivedStatus(m: MemberWithSub): MemberStatus {
  if (m.status === "suspended") return "suspended";
  if (m.subscription?.end_date) return getSubscriptionStatus(m.subscription.end_date);
  return m.status;
}

export default function ReceptionMembersPage() {
  const { t } = useTranslation();
  const { success, error: toastError, warning } = useToast();
  const [members, setMembers] = useState<MemberWithSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expiring" | "expired" | "suspended">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<MemberWithSub | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const supabase = createBrowserSupabase();
      // fetchAllRows — a plain .select() caps at 1000 rows, which hid
      // members past the cap from this list. Page through all of them.
      const { data, error } = await fetchAllRows<Record<string, unknown>>(() => supabase
        .from("members")
        .select("*, subscription:member_subscriptions(*)")
        .order("created_at", { ascending: false }));
      if (error) throw error;

      setMembers((data ?? []).map((m: Record<string, unknown>) => ({
        ...m,
        // A member can have several sub rows — show the one that ends
        // LAST (their current reality), not whichever the join returned first.
        subscription: Array.isArray(m.subscription)
          ? [...(m.subscription as Array<{ end_date?: string }>)]
              .sort((a, b) => String(b.end_date ?? "").localeCompare(String(a.end_date ?? "")))[0] ?? null
          : m.subscription,
      })) as MemberWithSub[]);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Deep-link support: /reception/members?id=<member_id> (used by the
    // dashboard quick-search) highlights and scrolls to that member.
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) setHighlightId(id);
  }, [load]);

  useEffect(() => {
    if (!loading && highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [loading, highlightId]);

  async function call(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok && json.success, json };
  }

  async function toggleStatus(m: MemberWithSub) {
    const next = m.status === "suspended" ? "active" : "suspended";
    const confirmMsg = next === "suspended"
      ? `${t("reception.confirmSuspend")} ${m.full_name}؟`
      : `${t("reception.confirmReactivate")} ${m.full_name}؟`;
    if (!window.confirm(confirmMsg)) return;
    setBusyId(m.id);
    const { ok, json } = await call("/api/reception/set-member-status", { member_id: m.id, status: next });
    setBusyId(null);
    if (!ok) return toastError(t("reception.actionFailed"), String(json.error ?? ""));
    success(next === "suspended" ? t("reception.memberSuspended") : t("reception.memberReactivated"), m.full_name);
    setMembers((prev) => prev.map((x) => x.id === m.id ? { ...x, status: next } : x));
  }

  async function resetPassword(m: MemberWithSub) {
    if (!window.confirm(`${t("reception.confirmResetPassword")} ${m.full_name}؟`)) return;
    setBusyId(m.id);
    const { ok, json } = await call("/api/reception/reset-password", { member_id: m.id });
    setBusyId(null);
    if (!ok) return toastError(t("reception.actionFailed"), String(json.error ?? ""));
    warning(t("reception.tempPassword"), `${m.full_name}: ${json.temp_password}`);
    try { await navigator.clipboard?.writeText(String(json.temp_password)); } catch { /* ignore */ }
  }

  async function deleteMember(m: MemberWithSub) {
    if (!window.confirm(`${t("reception.confirmDelete")} ${m.full_name}؟  ${t("reception.noUndo")}`)) return;
    setBusyId(m.id);
    const { ok, json } = await call("/api/reception/delete-duplicate-member", { member_id: m.id });
    setBusyId(null);
    if (!ok) return toastError(t("reception.actionFailed"), String(json.error ?? ""));
    success(t("reception.memberDeleted"), m.full_name);
    setMembers((prev) => prev.filter((x) => x.id !== m.id));
  }

  async function renewSub(m: MemberWithSub) {
    if (!m.subscription) return;
    const daysStr = window.prompt(
      `${t("reception.renewSubscription")} — ${m.full_name}\n${t("members.endDate")}: ${m.subscription.end_date}\n${t("reception.renewDays")}`,
      "30",
    );
    if (!daysStr) return;
    const days = parseInt(daysStr, 10);
    if (!Number.isFinite(days) || days < 1) return toastError(t("reception.actionFailed"), daysStr);
    setBusyId(m.id);
    // member_subscriptions is a view over gym_subscriptions, so the
    // joined row's id IS the gym_subscriptions id extend-sub expects.
    const { ok, json } = await call("/api/reception/extend-sub", { sub_id: m.subscription.id, days });
    setBusyId(null);
    if (!ok) return toastError(t("reception.actionFailed"), String(json.error ?? ""));
    success(t("reception.renewed"), `${m.full_name} → ${json.new_end}`);
    setMembers((prev) => prev.map((x) =>
      x.id === m.id && x.subscription
        ? { ...x, subscription: { ...x.subscription, end_date: String(json.new_end) } }
        : x,
    ));
  }

  const filtered = members.filter((m) => {
    if (filter !== "all" && derivedStatus(m) !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return m.full_name.toLowerCase().includes(q)
        || (m.username?.toLowerCase().includes(q) ?? false)
        || (m.phone?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });
  const visible = filtered.slice(0, RENDER_CAP);

  const filters = ["all", "active", "expiring", "expired", "suspended"] as const;

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-4xl mx-auto space-y-5">
      <h1 className="font-display text-[28px] tracking-wider text-white">{t("reception.memberList")}</h1>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("reception.searchMember")}
          className="w-full h-11 pl-10 rtl:pl-4 rtl:pr-10 bg-white/[0.04] border border-white/[0.08] text-white text-[14px] placeholder:text-white/30 focus:border-[#4ECDC4]/50 focus:outline-none transition-colors"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 text-[12px] font-medium uppercase tracking-wider transition-colors",
              filter === f ? "bg-[#4ECDC4]/20 text-[#4ECDC4] border border-[#4ECDC4]/30" : "bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-white/60",
            )}
          >
            {t(`members.${f}`)}
          </button>
        ))}
      </div>

      {/* Member List */}
      {loading ? (
        <div className="text-white/40 text-center py-12">{t("common.loading")}</div>
      ) : loadError ? (
        <div className="text-center py-16 border border-danger/20 bg-danger/[0.04]">
          <AlertCircle size={36} className="mx-auto text-danger/60 mb-3" />
          <p className="text-danger text-[14px] mb-4">{t("reception.loadFailed")}</p>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 px-4 h-10 border border-white/[0.12] text-white/70 hover:text-white hover:border-white/30 text-[13px] transition-colors"
          >
            <RefreshCw size={14} /> {t("reception.retry")}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <User size={40} className="mx-auto text-white/10 mb-4" />
          <p className="text-white/40 text-[14px]">{search || filter !== "all" ? t("members.noMembersFiltered") : t("members.noMembers")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((member) => {
            const isPlayer = member.role === "player";
            const busy = busyId === member.id;
            const highlighted = highlightId === member.id;
            const status = derivedStatus(member);
            return (
              <div
                key={member.id}
                ref={highlighted ? highlightRef : undefined}
                className={cn(
                  "bg-white/[0.04] border p-4 transition-colors",
                  highlighted ? "border-[#4ECDC4]/60 bg-[#4ECDC4]/[0.06]" : "border-white/[0.06] hover:bg-white/[0.06]",
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#4ECDC4]/10 flex items-center justify-center text-[#4ECDC4] font-bold text-[14px] flex-shrink-0">
                    {member.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[14px] font-medium truncate">{member.full_name}</p>
                    <p className="text-white/40 text-[12px] truncate" dir="ltr">
                      {member.phone ?? ""}{member.username ? ` · ${member.username}` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {isPlayer ? (
                      <span className={cn(
                        "text-[11px] font-bold uppercase px-2 py-1",
                        status === "active" ? "bg-green-500/10 text-green-400" :
                        status === "expiring" ? "bg-gold/10 text-gold" :
                        status === "suspended" ? "bg-danger/15 text-danger" :
                        "bg-danger/10 text-danger"
                      )}>
                        {t(`members.${status}`)}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold uppercase px-2 py-1 bg-white/[0.06] text-white/50">
                        {t("reception.staffAccount")}
                      </span>
                    )}
                    {member.subscription && (
                      <p className="text-white/30 text-[11px] mt-1" dir="ltr">
                        {member.subscription.plan_type} → {member.subscription.end_date}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {isPlayer && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-white/[0.05]">
                    <ActionBtn onClick={() => setEditing(member)} disabled={busy}>
                      <Pencil size={11} /> {t("common.edit")}
                    </ActionBtn>
                    {member.subscription && (
                      <ActionBtn onClick={() => renewSub(member)} disabled={busy} tone="primary">
                        <CalendarPlus size={11} /> {t("common.renew")}
                      </ActionBtn>
                    )}
                    <ActionBtn onClick={() => resetPassword(member)} disabled={busy}>
                      <KeyRound size={11} /> {t("reception.resetPassword")}
                    </ActionBtn>
                    <ActionBtn onClick={() => toggleStatus(member)} disabled={busy} tone={member.status === "suspended" ? "primary" : "warn"}>
                      {member.status === "suspended" ? <Power size={11} /> : <Ban size={11} />}
                      {member.status === "suspended" ? t("reception.reactivate") : t("reception.suspend")}
                    </ActionBtn>
                    <ActionBtn onClick={() => deleteMember(member)} disabled={busy} tone="danger">
                      <Trash2 size={11} /> {t("reception.deleteAccount")}
                    </ActionBtn>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length > RENDER_CAP && (
            <p className="text-white/30 text-[12px] text-center py-3">
              {t("reception.showingFirst")} {RENDER_CAP} / {filtered.length} — {t("reception.searchToNarrow")}
            </p>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <EditMemberModal
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={(applied) => {
            setMembers((prev) => prev.map((x) => x.id === editing.id ? { ...x, ...applied } : x));
            setEditing(null);
            success(t("reception.memberUpdated"), applied.full_name ?? editing.full_name);
          }}
        />
      )}
    </div>
  );
}

function ActionBtn({
  children, onClick, disabled, tone = "ghost",
}: {
  children: React.ReactNode;
  onClick:  () => void;
  disabled?: boolean;
  tone?: "ghost" | "warn" | "danger" | "primary";
}) {
  const tones = {
    ghost:   "border-white/[0.1] text-white/55 hover:text-white hover:border-white/25",
    warn:    "border-gold/25 text-gold/80 hover:text-gold hover:border-gold/50",
    danger:  "border-danger/25 text-danger/80 hover:text-danger hover:border-danger/50",
    primary: "border-[#4ECDC4]/30 text-[#4ECDC4] hover:border-[#4ECDC4]/60",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 h-7 px-2.5 border text-[11px] font-medium transition-colors disabled:opacity-40",
        tones,
      )}
    >
      {children}
    </button>
  );
}

function EditMemberModal({
  member, onClose, onSaved,
}: {
  member:  { id: string; full_name: string; phone: string | null };
  onClose: () => void;
  onSaved: (applied: { full_name?: string; phone?: string }) => void;
}) {
  const { t } = useTranslation();
  const { error: toastError } = useToast();
  const [name, setName]   = useState(member.full_name);
  const [phone, setPhone] = useState(member.phone ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const payload: Record<string, string> = { member_id: member.id };
    if (name.trim() && name.trim() !== member.full_name) payload.full_name = name.trim();
    if (phone.trim() && phone.trim() !== (member.phone ?? "")) payload.phone = phone.trim();
    if (!payload.full_name && !payload.phone) { onClose(); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/reception/update-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toastError(t("reception.actionFailed"), String(json.error ?? ""));
        return;
      }
      onSaved({ full_name: payload.full_name, phone: payload.phone });
    } catch {
      toastError(t("reception.actionFailed"), "");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="w-full max-w-sm bg-charcoal border border-steel p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-white text-[15px] font-bold">{t("reception.editMember")}</p>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white transition-colors" aria-label={t("common.close")}>
            <X size={16} />
          </button>
        </div>
        <div>
          <label className="text-white/40 text-[11px] font-mono uppercase tracking-wider block mb-1">{t("common.name")}</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-11 px-3 bg-iron border border-steel text-white text-[14px] focus:border-[#4ECDC4]/50 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="text-white/40 text-[11px] font-mono uppercase tracking-wider block mb-1">{t("common.phone")}</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
            className="w-full h-11 px-3 bg-iron border border-steel text-white text-[14px] focus:border-[#4ECDC4]/50 focus:outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-10 border border-white/[0.1] text-white/60 text-[13px] hover:text-white transition-colors disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !name.trim()}
            className="flex-1 h-10 bg-[#4ECDC4] text-void text-[13px] font-bold inline-flex items-center justify-center gap-1.5 hover:bg-[#4ECDC4]/90 transition-colors disabled:opacity-50"
          >
            <Save size={13} /> {saving ? "..." : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
