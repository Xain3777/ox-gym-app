"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Link2,
  PhoneCall,
  UserCheck,
  Sparkles,
  KeyRound,
  Ban,
  Power,
  Search,
  XCircle,
  UserPlus,
} from "lucide-react";

type InterventionItem = {
  member_id: string;
  auth_id: string | null;
  full_name: string;
  phone: string | null;
  reason: string;
  reason_text: string;
  actionable: boolean;
  suggested_action: "auto_activate" | "delete_duplicate" | "rebind" | "renew" | "create_sub" | "none";
  orphan_sub_id?: string;
  other_member_id?: string;
};

type DuplicateGroup = {
  phone_normalized: string;
  phone_display: string;
  rows: Array<{
    member_id: string;
    auth_id: string | null;
    full_name: string;
    created_at: string;
    kind: "app" | "stub";
  }>;
};

type OrphanSub = {
  sub_id: string;
  member_name: string;
  phone: string | null;
  amount: number | null;
  activation_code: string;
  end_date: string;
  matching_member_id: string;
  matching_full_name: string;
  matching_auth_id: string;
};

type ExpiredBound = {
  member_id: string;
  full_name: string;
  phone: string | null;
  sub_id: string;
  activation_code: string;
  amount: number | null;
  ended_on: string;
};

type AllPlayer = {
  member_id: string;
  auth_id: string | null;
  full_name: string;
  phone: string | null;
  status: string;
  has_live_sub: boolean;
  current_code: string | null;
  sub_end_date: string | null;
  sub_id: string | null;
  has_app_registration: boolean;
};

type HealthData = {
  counts: { intervention: number; duplicates: number; orphan_subs: number; expired_bound: number; all_players: number };
  data: {
    intervention: InterventionItem[];
    duplicates: DuplicateGroup[];
    orphan_subs: OrphanSub[];
    expired_bound: ExpiredBound[];
    all_players: AllPlayer[];
  };
};

export default function ReceptionHealthPage() {
  const { success, error: toastError, warning } = useToast();
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/reception/health");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to load");
      setData(json);
    } catch (e) {
      toastError("فشل التحميل", e instanceof Error ? e.message : "حاول مرة أخرى.");
    } finally { setLoading(false); }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  async function call(url: string, body: Record<string, unknown>): Promise<{ ok: boolean; json: Record<string, unknown> }> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return { ok: res.ok && json.success, json };
  }

  async function autoActivate(item: InterventionItem) {
    if (!item.orphan_sub_id) return;
    setBusyId(item.member_id);
    const { ok, json } = await call("/api/reception/auto-activate", { mode: "single", member_id: item.member_id, sub_id: item.orphan_sub_id });
    setBusyId(null);
    if (!ok) { toastError("فشل التفعيل", String(json.error ?? "")); return; }
    success("تم تفعيل الحساب", item.full_name);
    load();
  }

  async function deleteMember(memberId: string, label: string) {
    if (!window.confirm(`حذف الحساب: ${label}؟  لا يمكن التراجع.`)) return;
    setBusyId(memberId);
    const { ok, json } = await call("/api/reception/delete-duplicate-member", { member_id: memberId });
    setBusyId(null);
    if (!ok) { toastError("فشل الحذف", String(json.error ?? "")); return; }
    success("تم الحذف", label);
    load();
  }

  async function linkOrphan(sub: OrphanSub) {
    setBusyId(sub.sub_id);
    const { ok, json } = await call("/api/reception/link-orphan-sub", { sub_id: sub.sub_id, member_id: sub.matching_member_id });
    setBusyId(null);
    if (!ok) { toastError("فشل الربط", String(json.error ?? "")); return; }
    success("تم الربط", `${sub.member_name} → ${sub.matching_full_name}`);
    load();
  }

  async function bulkActivate() {
    if (!window.confirm("تفعيل تلقائي للجميع — سيتم ربط كل لاعب لديه كود غير مفعّل بحسابه. متابعة؟")) return;
    setBulkRunning(true);
    const { ok, json } = await call("/api/reception/auto-activate", { mode: "bulk" });
    setBulkRunning(false);
    if (!ok) { toastError("فشل التفعيل الجماعي", String(json.error ?? "")); return; }
    success(`تم تفعيل ${json.bound} حساب`, Number(json.failed) > 0 ? `فشل ${json.failed}` : "");
    load();
  }

  async function toggleStatus(memberId: string, current: string, label: string) {
    const next = current === "suspended" ? "active" : "suspended";
    const verb = next === "suspended" ? "إيقاف" : "إعادة تفعيل";
    if (!window.confirm(`${verb} الحساب: ${label}؟`)) return;
    setBusyId(memberId);
    const { ok, json } = await call("/api/reception/set-member-status", { member_id: memberId, status: next });
    setBusyId(null);
    if (!ok) { toastError(`فشل ${verb}`, String(json.error ?? "")); return; }
    success(verb === "إيقاف" ? "تم إيقاف الحساب" : "تم إعادة التفعيل", label);
    load();
  }

  async function resetPassword(memberId: string, label: string) {
    if (!window.confirm(`إعادة تعيين كلمة المرور للعضو: ${label}؟`)) return;
    setBusyId(memberId);
    const { ok, json } = await call("/api/reception/reset-password", { member_id: memberId });
    setBusyId(null);
    if (!ok) { toastError("فشل إعادة التعيين", String(json.error ?? "")); return; }
    warning("كلمة المرور المؤقتة", `${label}: ${json.temp_password}`);
    // Also copy to clipboard for easy paste
    try { await navigator.clipboard?.writeText(String(json.temp_password)); } catch { /* ignore */ }
  }

  async function cancelSub(subId: string, label: string) {
    const reason = window.prompt(`سبب الإلغاء (اختياري) للاشتراك: ${label}`, "");
    if (reason === null) return;
    setBusyId(subId);
    const { ok, json } = await call("/api/reception/cancel-subscription", { sub_id: subId, reason: reason || undefined });
    setBusyId(null);
    if (!ok) { toastError("فشل الإلغاء", String(json.error ?? "")); return; }
    success("تم إلغاء الاشتراك", label);
    load();
  }

  const filteredAll = useMemo<AllPlayer[]>(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.data.all_players;
    return data.data.all_players.filter((p) =>
      p.full_name.toLowerCase().includes(q) || (p.phone?.toLowerCase().includes(q) ?? false),
    );
  }, [data, search]);

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-5xl mx-auto space-y-5" dir="rtl">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[#4ECDC4] text-[10px] font-mono uppercase tracking-[0.16em]">ACCOUNT HEALTH</p>
          <h1 className="font-display text-[28px] tracking-wider text-white mt-1">صحة الحسابات</h1>
          <p className="text-white/40 text-[13px] mt-1">إصلاح، حذف، تفعيل، إيقاف، إنشاء، إعادة كلمة المرور — كل ما يحتاج الاستقبال.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={load}
            className="inline-flex items-center gap-2 border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/70 px-3 py-2 text-[12px]">
            <RefreshCw size={13} /> تحديث
          </button>
          <Link href="/reception/create"
            className="inline-flex items-center gap-2 border border-[#4ECDC4]/30 bg-[#4ECDC4]/10 hover:bg-[#4ECDC4]/20 text-[#4ECDC4] px-3 py-2 text-[12px]">
            <UserPlus size={13} /> إنشاء حساب
          </Link>
          <button type="button" onClick={bulkActivate} disabled={bulkRunning || loading}
            className="inline-flex items-center gap-2 bg-[#4ECDC4] text-void px-4 py-2 text-[13px] font-bold hover:bg-[#4ECDC4]/90 disabled:opacity-50">
            <Sparkles size={14} />
            {bulkRunning ? "جار التفعيل..." : "تفعيل تلقائي للجميع"}
          </button>
        </div>
      </header>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="يحتاج تدخّل"      value={data.counts.intervention} tone="danger" />
          <StatCard label="حسابات مكررة"      value={data.counts.duplicates}   tone="gold" />
          <StatCard label="اشتراكات غير مربوطة" value={data.counts.orphan_subs}  tone="blue" />
          <StatCard label="منتهية الصلاحية"    value={data.counts.expired_bound} tone="muted" />
          <StatCard label="كل اللاعبين"        value={data.counts.all_players} tone="teal" />
        </div>
      )}

      {loading && <div className="text-white/40 text-[14px] text-center py-12">جار التحميل...</div>}

      {data && !loading && (
        <>
          {/* Section A: Intervention */}
          <Section title="حسابات تحتاج تدخّل" count={data.data.intervention.length} icon={<AlertTriangle size={16} className="text-danger" />}>
            {data.data.intervention.length === 0 ? (
              <Empty text="لا توجد حسابات تحتاج تدخّل — حالة ممتازة." />
            ) : (
              <div className="space-y-2">
                {data.data.intervention.map((p) => (
                  <div key={p.member_id} className="border border-white/[0.06] bg-iron/60 p-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-[14px] font-semibold">{p.full_name}</p>
                        <p className="text-white/40 text-[12px]" dir="ltr">{p.phone ?? "—"}</p>
                        <p className="text-danger/85 text-[12px] mt-1">⚠ {p.reason_text}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                        {p.suggested_action === "auto_activate" && (
                          <ActionBtn icon={<UserCheck size={12} />} tone="emerald" busy={busyId === p.member_id} onClick={() => autoActivate(p)}>
                            تفعيل تلقائي
                          </ActionBtn>
                        )}
                        {p.suggested_action === "delete_duplicate" && (
                          <ActionBtn icon={<Trash2 size={12} />} tone="red" busy={busyId === p.member_id} onClick={() => deleteMember(p.member_id, p.full_name)}>
                            حذف المكرر
                          </ActionBtn>
                        )}
                        {p.suggested_action === "create_sub" && (
                          <Link href={`/reception/create?phone=${encodeURIComponent(p.phone ?? "")}`}
                            className="inline-flex items-center gap-1.5 bg-[#4ECDC4]/10 border border-[#4ECDC4]/30 text-[#4ECDC4] px-3 py-1.5 text-[11px] hover:bg-[#4ECDC4]/20">
                            <UserPlus size={12} /> إنشاء اشتراك
                          </Link>
                        )}
                        {p.suggested_action === "renew" && (
                          <span className="inline-flex items-center gap-1.5 bg-gold/10 border border-gold/25 text-gold px-3 py-1.5 text-[11px]">
                            <PhoneCall size={12} /> يحتاج تجديد بالاستقبال
                          </span>
                        )}
                        {p.suggested_action === "rebind" && (
                          <span className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-300 px-3 py-1.5 text-[11px]">
                            ⚠ كود مأخوذ — راجع الكود
                          </span>
                        )}
                        <ActionBtn icon={<KeyRound size={12} />} tone="blue" busy={busyId === p.member_id} onClick={() => resetPassword(p.member_id, p.full_name)}>
                          كلمة مرور
                        </ActionBtn>
                        <ActionBtn icon={<Trash2 size={12} />} tone="red" busy={busyId === p.member_id} onClick={() => deleteMember(p.member_id, p.full_name)}>
                          حذف
                        </ActionBtn>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Section B: Duplicates */}
          <Section title="حسابات مكررة (نفس الهاتف)" count={data.data.duplicates.length} icon={<AlertTriangle size={16} className="text-gold" />}>
            {data.data.duplicates.length === 0 ? (
              <Empty text="لا توجد حسابات مكررة." />
            ) : (
              <div className="space-y-3">
                {data.data.duplicates.map((group) => (
                  <div key={group.phone_normalized} className="border border-white/[0.06] bg-iron/60 p-3">
                    <p className="text-white/60 text-[12px] mb-2" dir="ltr">📞 {group.phone_display}</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {group.rows.map((r) => (
                        <div key={r.member_id} className="border border-white/[0.06] bg-black/15 p-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-white text-[13px]">{r.full_name}</p>
                              <p className="text-white/35 text-[11px]">
                                {r.kind === "app" ? "✅ حساب تطبيق" : "📋 سجل استقبال"} · {r.created_at?.slice(0, 10)}
                              </p>
                            </div>
                            <ActionBtn icon={<Trash2 size={11} />} tone="red" busy={busyId === r.member_id} onClick={() => deleteMember(r.member_id, r.full_name)} size="sm">
                              حذف
                            </ActionBtn>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Section C: Orphan subs */}
          <Section title="اشتراكات غير مربوطة (يوجد حساب مطابق)" count={data.data.orphan_subs.length} icon={<Link2 size={16} className="text-blue-400" />}>
            {data.data.orphan_subs.length === 0 ? (
              <Empty text="جميع الاشتراكات مربوطة بحساباتها." />
            ) : (
              <div className="space-y-2">
                {data.data.orphan_subs.map((s) => (
                  <div key={s.sub_id} className="border border-white/[0.06] bg-iron/60 p-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-[13px]">{s.member_name} (اشتراك) ↔ {s.matching_full_name} (تطبيق)</p>
                        <p className="text-white/40 text-[12px]" dir="ltr">{s.phone ?? "—"}  ·  code={s.activation_code}  ·  ${s.amount ?? "—"}  ·  ends {s.end_date}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <ActionBtn icon={<Link2 size={12} />} tone="blue" busy={busyId === s.sub_id} onClick={() => linkOrphan(s)}>
                          ربط الآن
                        </ActionBtn>
                        <ActionBtn icon={<XCircle size={12} />} tone="red" busy={busyId === s.sub_id} onClick={() => cancelSub(s.sub_id, `${s.member_name} / ${s.activation_code}`)}>
                          إلغاء الاشتراك
                        </ActionBtn>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Section D: Expired bound */}
          <Section title="اشتراكات منتهية (حساب فعّال بحاجة تجديد)" count={data.data.expired_bound.length} icon={<CheckCircle2 size={16} className="text-white/40" />}>
            {data.data.expired_bound.length === 0 ? (
              <Empty text="لا توجد اشتراكات منتهية." />
            ) : (
              <div className="space-y-1.5">
                {data.data.expired_bound.map((e) => (
                  <div key={e.sub_id} className="border border-white/[0.05] bg-black/10 px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <span className="text-white/80 text-[13px]">{e.full_name}</span>
                      <span className="text-white/35 text-[11px] mr-2" dir="ltr">{e.phone ?? "—"} · انتهى {e.ended_on}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gold text-[11px]">يحتاج تجديد</span>
                      <ActionBtn icon={<XCircle size={11} />} tone="red" busy={busyId === e.sub_id} onClick={() => cancelSub(e.sub_id, `${e.full_name} / ${e.activation_code}`)} size="sm">
                        إلغاء
                      </ActionBtn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Section E: All players */}
          <Section
            title="كل اللاعبين"
            count={data.data.all_players.length}
            icon={<Power size={16} className="text-[#4ECDC4]" />}
          >
            <div className="relative mb-3">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو الهاتف"
                className="w-full h-10 pr-9 pl-3 bg-iron border border-steel text-white text-[13px] placeholder:text-white/30 focus:border-[#4ECDC4]/50 focus:outline-none"
              />
            </div>
            {filteredAll.length === 0 ? (
              <Empty text={search ? "لا توجد نتائج للبحث" : "لا يوجد لاعبون."} />
            ) : (
              <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
                {filteredAll.slice(0, 200).map((p) => (
                  <div key={p.member_id} className="border border-white/[0.05] bg-black/15 px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white/85 text-[13px]">{p.full_name}</span>
                        <span className="text-white/35 text-[11px]" dir="ltr">{p.phone ?? "—"}</span>
                        {p.status === "suspended" && (
                          <span className="bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] px-1.5 py-0.5">موقوف</span>
                        )}
                        {p.has_live_sub ? (
                          <span className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[10px] px-1.5 py-0.5">
                            مفعّل · {p.current_code}
                          </span>
                        ) : (
                          <span className="bg-white/[0.05] border border-white/[0.1] text-white/50 text-[10px] px-1.5 py-0.5">غير مفعّل</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <ActionBtn icon={<KeyRound size={11} />} tone="blue" busy={busyId === p.member_id} onClick={() => resetPassword(p.member_id, p.full_name)} size="sm">
                        كلمة مرور
                      </ActionBtn>
                      <ActionBtn
                        icon={p.status === "suspended" ? <Power size={11} /> : <Ban size={11} />}
                        tone={p.status === "suspended" ? "emerald" : "orange"}
                        busy={busyId === p.member_id}
                        onClick={() => toggleStatus(p.member_id, p.status, p.full_name)}
                        size="sm"
                      >
                        {p.status === "suspended" ? "تفعيل" : "إيقاف"}
                      </ActionBtn>
                      <ActionBtn icon={<Trash2 size={11} />} tone="red" busy={busyId === p.member_id} onClick={() => deleteMember(p.member_id, p.full_name)} size="sm">
                        حذف
                      </ActionBtn>
                    </div>
                  </div>
                ))}
                {filteredAll.length > 200 && (
                  <p className="text-white/30 text-[11px] text-center py-2">عرض أول 200 — ابحث لتصفية المزيد.</p>
                )}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "danger" | "gold" | "blue" | "muted" | "teal" }) {
  const tones = {
    danger: { box: "border-danger/25 bg-danger/[0.06]",     num: "text-danger" },
    gold:   { box: "border-gold/25 bg-gold/[0.06]",         num: "text-gold" },
    blue:   { box: "border-blue-400/25 bg-blue-400/[0.06]", num: "text-blue-300" },
    muted:  { box: "border-white/[0.08] bg-white/[0.03]",   num: "text-white/60" },
    teal:   { box: "border-[#4ECDC4]/25 bg-[#4ECDC4]/[0.06]", num: "text-[#4ECDC4]" },
  }[tone];
  return (
    <div className={cn("border p-3 text-center", tones.box)}>
      <p className={cn("text-[24px] font-display", tones.num)}>{value}</p>
      <p className="text-white/50 text-[10px] font-mono uppercase tracking-[0.14em] mt-1">{label}</p>
    </div>
  );
}

function Section({ title, count, icon, children }: { title: string; count: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border border-white/[0.06] bg-white/[0.025]">
      <header className="flex items-center gap-2 p-3 border-b border-white/[0.06]">
        {icon}
        <h2 className="text-white text-[14px] font-semibold flex-1">{title}</h2>
        <span className="text-white/40 text-[11px] font-mono">{count}</span>
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-white/30 text-[12px] text-center py-6">{text}</p>;
}

function ActionBtn({
  icon, tone, busy, onClick, children, size = "md",
}: {
  icon: React.ReactNode;
  tone: "emerald" | "red" | "blue" | "orange";
  busy: boolean;
  onClick: () => void;
  children: React.ReactNode;
  size?: "sm" | "md";
}) {
  const tones = {
    emerald: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25",
    red:     "bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20",
    blue:    "bg-blue-400/10 border-blue-400/30 text-blue-300 hover:bg-blue-400/20",
    orange:  "bg-orange-500/10 border-orange-500/30 text-orange-300 hover:bg-orange-500/20",
  }[tone];
  const padding = size === "sm" ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn("inline-flex items-center gap-1 border disabled:opacity-50 disabled:cursor-not-allowed", tones, padding)}
    >
      {icon} {children}
    </button>
  );
}
