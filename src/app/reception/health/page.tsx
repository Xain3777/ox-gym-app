"use client";

import { useEffect, useState } from "react";
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

type HealthData = {
  counts: { intervention: number; duplicates: number; orphan_subs: number; expired_bound: number };
  data: {
    intervention: InterventionItem[];
    duplicates: DuplicateGroup[];
    orphan_subs: OrphanSub[];
    expired_bound: ExpiredBound[];
  };
};

export default function ReceptionHealthPage() {
  const { success, error: toastError } = useToast();
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);

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

  async function autoActivate(item: InterventionItem) {
    if (!item.orphan_sub_id) return;
    setBusyId(item.member_id);
    try {
      const res = await fetch("/api/reception/auto-activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "single", member_id: item.member_id, sub_id: item.orphan_sub_id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toastError("فشل التفعيل", json.error ?? ""); return; }
      success("تم تفعيل الحساب", item.full_name);
      await load();
    } finally { setBusyId(null); }
  }

  async function deleteMember(memberId: string, label: string) {
    if (!window.confirm(`حذف الحساب: ${label}؟  لا يمكن التراجع.`)) return;
    setBusyId(memberId);
    try {
      const res = await fetch("/api/reception/delete-duplicate-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toastError("فشل الحذف", json.error ?? ""); return; }
      success("تم الحذف", label);
      await load();
    } finally { setBusyId(null); }
  }

  async function linkOrphan(sub: OrphanSub) {
    setBusyId(sub.sub_id);
    try {
      const res = await fetch("/api/reception/link-orphan-sub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sub_id: sub.sub_id, member_id: sub.matching_member_id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toastError("فشل الربط", json.error ?? ""); return; }
      success("تم الربط", `${sub.member_name} → ${sub.matching_full_name}`);
      await load();
    } finally { setBusyId(null); }
  }

  async function bulkActivate() {
    if (!window.confirm("تفعيل تلقائي للجميع — سيتم ربط كل لاعب لديه كود غير مفعّل بحسابه. متابعة؟")) return;
    setBulkRunning(true);
    try {
      const res = await fetch("/api/reception/auto-activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "bulk" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toastError("فشل التفعيل الجماعي", json.error ?? ""); return; }
      success(`تم تفعيل ${json.bound} حساب`, json.failed > 0 ? `فشل ${json.failed}` : "");
      await load();
    } finally { setBulkRunning(false); }
  }

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-5xl mx-auto space-y-5" dir="rtl">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[#4ECDC4] text-[10px] font-mono uppercase tracking-[0.16em]">ACCOUNT HEALTH</p>
          <h1 className="font-display text-[28px] tracking-wider text-white mt-1">صحة الحسابات</h1>
          <p className="text-white/40 text-[13px] mt-1">إصلاح الحسابات، حذف المكررات، تفعيل تلقائي.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/70 px-3 py-2 text-[12px]"
          >
            <RefreshCw size={13} /> تحديث
          </button>
          <button
            type="button"
            onClick={bulkActivate}
            disabled={bulkRunning || loading}
            className="inline-flex items-center gap-2 bg-[#4ECDC4] text-void px-4 py-2 text-[13px] font-bold hover:bg-[#4ECDC4]/90 disabled:opacity-50"
          >
            <Sparkles size={14} />
            {bulkRunning ? "جار التفعيل..." : "تفعيل تلقائي للجميع"}
          </button>
        </div>
      </header>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="يحتاج تدخّل"      value={data.counts.intervention} tone="danger" />
          <StatCard label="حسابات مكررة"      value={data.counts.duplicates}   tone="gold" />
          <StatCard label="اشتراكات غير مربوطة" value={data.counts.orphan_subs}  tone="blue" />
          <StatCard label="منتهية الصلاحية"    value={data.counts.expired_bound} tone="muted" />
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
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {p.suggested_action === "auto_activate" && (
                          <button
                            type="button"
                            onClick={() => autoActivate(p)}
                            disabled={busyId === p.member_id}
                            className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 px-3 py-1.5 text-[11px] hover:bg-emerald-500/25 disabled:opacity-50"
                          >
                            <UserCheck size={12} /> تفعيل تلقائي
                          </button>
                        )}
                        {p.suggested_action === "delete_duplicate" && (
                          <button
                            type="button"
                            onClick={() => deleteMember(p.member_id, p.full_name)}
                            disabled={busyId === p.member_id}
                            className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-300 px-3 py-1.5 text-[11px] hover:bg-red-500/20 disabled:opacity-50"
                          >
                            <Trash2 size={12} /> حذف المكرر
                          </button>
                        )}
                        {p.suggested_action === "renew" && (
                          <span className="inline-flex items-center gap-1.5 bg-gold/10 border border-gold/25 text-gold px-3 py-1.5 text-[11px]">
                            <PhoneCall size={12} /> يحتاج تجديد بالاستقبال
                          </span>
                        )}
                        {p.suggested_action === "create_sub" && (
                          <span className="inline-flex items-center gap-1.5 bg-blue-400/10 border border-blue-400/25 text-blue-300 px-3 py-1.5 text-[11px]">
                            <PhoneCall size={12} /> يحتاج إنشاء اشتراك
                          </span>
                        )}
                        {p.suggested_action === "rebind" && (
                          <span className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-300 px-3 py-1.5 text-[11px]">
                            ⚠ كود مأخوذ — راجع الكود
                          </span>
                        )}
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
                            <button
                              type="button"
                              onClick={() => deleteMember(r.member_id, r.full_name)}
                              disabled={busyId === r.member_id}
                              className="inline-flex items-center gap-1 bg-red-500/10 border border-red-500/25 text-red-300 px-2 py-1 text-[10px] hover:bg-red-500/20 disabled:opacity-50"
                            >
                              <Trash2 size={11} /> حذف
                            </button>
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
                      <button
                        type="button"
                        onClick={() => linkOrphan(s)}
                        disabled={busyId === s.sub_id}
                        className="inline-flex items-center gap-1.5 bg-blue-400/10 border border-blue-400/30 text-blue-300 px-3 py-1.5 text-[11px] hover:bg-blue-400/20 disabled:opacity-50"
                      >
                        <Link2 size={12} /> ربط الآن
                      </button>
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
                    <div>
                      <span className="text-white/80 text-[13px]">{e.full_name}</span>
                      <span className="text-white/35 text-[11px] mr-2" dir="ltr">{e.phone ?? "—"} · انتهى {e.ended_on}</span>
                    </div>
                    <span className="text-gold text-[11px]">يحتاج تجديد من لوحة الاستقبال الرئيسية</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "danger" | "gold" | "blue" | "muted" }) {
  const c = {
    danger: "border-danger/25 bg-danger/[0.06] text-danger",
    gold:   "border-gold/25 bg-gold/[0.06] text-gold",
    blue:   "border-blue-400/25 bg-blue-400/[0.06] text-blue-300",
    muted:  "border-white/[0.08] bg-white/[0.03] text-white/60",
  }[tone];
  return (
    <div className={cn("border p-3 text-center", c.split(" ").slice(0, 2).join(" "))}>
      <p className={cn("text-[24px] font-display", c.split(" ")[2])}>{value}</p>
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
