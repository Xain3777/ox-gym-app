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
  Inbox,
  Users,
  Pencil,
  CalendarPlus,
  Unlink,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────
type SuggestedAction =
  | "auto_activate" | "delete_duplicate" | "rebind" | "renew" | "create_sub" | "none";

type InterventionItem = {
  member_id: string;
  auth_id: string | null;
  full_name: string;
  phone: string | null;
  reason: string;
  reason_text: string;
  actionable: boolean;
  suggested_action: SuggestedAction;
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

type MissingProfile = {
  member_id: string;
  auth_id: string;
  full_name: string;
  phone: string | null;
  sub_id: string;
  activation_code: string;
  end_date: string;
};

type HealthData = {
  counts: { intervention: number; duplicates: number; orphan_subs: number; expired_bound: number; missing_profiles: number; all_players: number };
  data: {
    intervention: InterventionItem[];
    duplicates: DuplicateGroup[];
    orphan_subs: OrphanSub[];
    expired_bound: ExpiredBound[];
    missing_profiles: MissingProfile[];
    all_players: AllPlayer[];
  };
};

// ── Page ─────────────────────────────────────────────────────────
export default function ReceptionHealthPage() {
  const { success, error: toastError, warning } = useToast();
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/reception/health");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to load");
      setData(json);
    } catch (e) {
      toastError("فشل التحميل", e instanceof Error ? e.message : "حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  async function call(url: string, body: Record<string, unknown>) {
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
    if (!ok) return toastError("فشل التفعيل", String(json.error ?? ""));
    success("تم تفعيل الحساب", item.full_name);
    load();
  }

  async function deleteMember(memberId: string, label: string) {
    if (!window.confirm(`حذف الحساب: ${label}؟  لا يمكن التراجع.`)) return;
    setBusyId(memberId);
    const { ok, json } = await call("/api/reception/delete-duplicate-member", { member_id: memberId });
    setBusyId(null);
    if (!ok) return toastError("فشل الحذف", String(json.error ?? ""));
    success("تم الحذف", label);
    load();
  }

  async function linkOrphan(sub: OrphanSub) {
    setBusyId(sub.sub_id);
    const { ok, json } = await call("/api/reception/link-orphan-sub", { sub_id: sub.sub_id, member_id: sub.matching_member_id });
    setBusyId(null);
    if (!ok) return toastError("فشل الربط", String(json.error ?? ""));
    success("تم الربط", `${sub.member_name} → ${sub.matching_full_name}`);
    load();
  }

  async function bulkActivate() {
    if (!window.confirm("تفعيل تلقائي للجميع — سيتم ربط كل لاعب لديه كود غير مفعّل بحسابه. متابعة؟")) return;
    setBulkRunning(true);
    const { ok, json } = await call("/api/reception/auto-activate", { mode: "bulk" });
    setBulkRunning(false);
    if (!ok) return toastError("فشل التفعيل الجماعي", String(json.error ?? ""));
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
    if (!ok) return toastError(`فشل ${verb}`, String(json.error ?? ""));
    success(next === "suspended" ? "تم إيقاف الحساب" : "تم إعادة التفعيل", label);
    load();
  }

  async function resetPassword(memberId: string, label: string) {
    if (!window.confirm(`إعادة تعيين كلمة المرور للعضو: ${label}؟`)) return;
    setBusyId(memberId);
    const { ok, json } = await call("/api/reception/reset-password", { member_id: memberId });
    setBusyId(null);
    if (!ok) return toastError("فشل إعادة التعيين", String(json.error ?? ""));
    warning("كلمة المرور المؤقتة", `${label}: ${json.temp_password}`);
    try { await navigator.clipboard?.writeText(String(json.temp_password)); } catch { /* ignore */ }
  }

  async function cancelSub(subId: string, label: string) {
    const reason = window.prompt(`سبب الإلغاء (اختياري) للاشتراك: ${label}`, "");
    if (reason === null) return;
    setBusyId(subId);
    const { ok, json } = await call("/api/reception/cancel-subscription", { sub_id: subId, reason: reason || undefined });
    setBusyId(null);
    if (!ok) return toastError("فشل الإلغاء", String(json.error ?? ""));
    success("تم إلغاء الاشتراك", label);
    load();
  }

  // ── Global search filter applied across all visible buckets ────
  const q = globalSearch.trim().toLowerCase();
  const matchesQ = (...fields: Array<string | null | undefined>) =>
    !q || fields.some((f) => (f ?? "").toLowerCase().includes(q));

  const filteredIntervention = useMemo<InterventionItem[]>(
    () => (data?.data.intervention ?? []).filter((p) => matchesQ(p.full_name, p.phone)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, q],
  );
  const filteredDuplicates = useMemo<DuplicateGroup[]>(
    () => (data?.data.duplicates ?? []).filter((g) =>
      matchesQ(g.phone_display) || g.rows.some((r) => matchesQ(r.full_name)),
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, q],
  );
  const filteredOrphans = useMemo<OrphanSub[]>(
    () => (data?.data.orphan_subs ?? []).filter((s) =>
      matchesQ(s.member_name, s.matching_full_name, s.phone, s.activation_code),
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, q],
  );
  const filteredExpired = useMemo<ExpiredBound[]>(
    () => (data?.data.expired_bound ?? []).filter((e) => matchesQ(e.full_name, e.phone)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, q],
  );
  const filteredAll = useMemo<AllPlayer[]>(
    () => (data?.data.all_players ?? []).filter((p) => matchesQ(p.full_name, p.phone, p.current_code)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, q],
  );
  const filteredMissing = useMemo<MissingProfile[]>(
    () => (data?.data.missing_profiles ?? []).filter((m) => matchesQ(m.full_name, m.phone, m.activation_code)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, q],
  );

  // ── Additional actions ────────────────────────────────────────
  async function restoreProfile(memberId: string, label: string) {
    setBusyId(memberId);
    const { ok, json } = await call("/api/reception/restore-profile", { mode: "single", member_id: memberId });
    setBusyId(null);
    if (!ok) return toastError("فشل الاستعادة", String(json.error ?? ""));
    success("تم استعادة الملف", label);
    load();
  }

  async function restoreAllMissing() {
    if (!window.confirm("استعادة جميع الملفات المفقودة دفعة واحدة؟")) return;
    setBulkRunning(true);
    const { ok, json } = await call("/api/reception/restore-profile", { mode: "bulk" });
    setBulkRunning(false);
    if (!ok) return toastError("فشل", String(json.error ?? ""));
    success(`تم استعادة ${json.restored} ملف`, `(${json.already_had} كانت سليمة)`);
    load();
  }

  async function unbindSub(subId: string, code: string) {
    if (!window.confirm(`فك ربط الكود ${code}؟  سيصبح قابلاً للمطالبة من جديد.`)) return;
    setBusyId(subId);
    const { ok, json } = await call("/api/reception/unbind-sub", { sub_id: subId });
    setBusyId(null);
    if (!ok) return toastError("فشل فك الربط", String(json.error ?? ""));
    success("تم فك الربط", code);
    load();
  }

  async function extendSub(subId: string, currentEnd: string | null, code: string) {
    const daysStr = window.prompt(`تمديد الكود ${code} (الحالي حتى ${currentEnd ?? "—"}). كم يوماً؟`, "30");
    if (!daysStr) return;
    const days = parseInt(daysStr, 10);
    if (!Number.isFinite(days) || days < 1) return toastError("عدد أيام غير صالح", daysStr);
    setBusyId(subId);
    const { ok, json } = await call("/api/reception/extend-sub", { sub_id: subId, days });
    setBusyId(null);
    if (!ok) return toastError("فشل التمديد", String(json.error ?? ""));
    success("تم التمديد", `حتى ${json.new_end}`);
    load();
  }

  async function editMember(memberId: string, currentName: string, currentPhone: string | null) {
    const newName = window.prompt("تعديل الاسم", currentName);
    if (newName === null) return;
    const newPhone = window.prompt("تعديل الهاتف (اتركه فارغاً للإبقاء على الحالي)", currentPhone ?? "");
    if (newPhone === null) return;
    const payload: Record<string, string> = { member_id: memberId };
    if (newName.trim() && newName.trim() !== currentName) payload.full_name = newName.trim();
    if (newPhone.trim() && newPhone.trim() !== (currentPhone ?? "")) payload.phone = newPhone.trim();
    if (!payload.full_name && !payload.phone) return;
    setBusyId(memberId);
    const { ok, json } = await call("/api/reception/update-member", payload);
    setBusyId(null);
    if (!ok) return toastError("فشل التعديل", String(json.error ?? ""));
    success("تم التعديل", "");
    void json;
    load();
  }

  return (
    <div className="min-h-full bg-void" dir="rtl">
      {/* ── Sticky page header ─────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-charcoal/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <p className="text-[#4ECDC4] text-[10px] font-mono uppercase tracking-[0.18em]">Account Health</p>
              <h1 className="font-display text-[26px] md:text-[30px] tracking-wider text-white leading-none mt-1.5">صحة الحسابات</h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <IconButton onClick={load} disabled={loading} title="تحديث">
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </IconButton>
              <Link href="/reception/create"
                className="inline-flex items-center gap-1.5 border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 px-3 h-9 text-[12px] font-medium">
                <UserPlus size={13} /> إنشاء حساب
              </Link>
              <button type="button" onClick={bulkActivate} disabled={bulkRunning || loading}
                className="inline-flex items-center gap-2 bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 text-void px-4 h-9 text-[13px] font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                <Sparkles size={14} />
                {bulkRunning ? "جار التفعيل..." : "تفعيل تلقائي للجميع"}
              </button>
            </div>
          </div>

          {/* Global search */}
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الهاتف أو الكود — يطبّق على كل الأقسام"
              className="w-full h-10 pr-9 pl-3 bg-iron border border-steel text-white text-[13px] placeholder:text-white/30 focus:border-[#4ECDC4]/50 focus:outline-none"
            />
          </div>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-5 pb-32 md:pb-10">

        {/* Stats strip */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <StatCard label="يحتاج تدخّل"      value={filteredIntervention.length} total={data.counts.intervention}  tone="danger" />
            <StatCard label="حسابات مكررة"      value={filteredDuplicates.length}   total={data.counts.duplicates}    tone="gold" />
            <StatCard label="اشتراكات معلّقة"   value={filteredOrphans.length}      total={data.counts.orphan_subs}   tone="blue" />
            <StatCard label="ملفات مفقودة"     value={filteredMissing.length}      total={data.counts.missing_profiles} tone="orange" />
            <StatCard label="منتهية"           value={filteredExpired.length}      total={data.counts.expired_bound} tone="muted" />
            <StatCard label="كل اللاعبين"      value={filteredAll.length}          total={data.counts.all_players}   tone="teal" />
          </div>
        )}

        {/* Advanced Tools: code lookup + manual bind */}
        {data && <AdvancedTools onAction={load} />}

        {loading && !data && <SkeletonSections />}

        {data && !loading && (
          <>
            <Section
              title="حسابات تحتاج تدخّل"
              subtitle="حسابات بحالة غير سليمة — لكل واحدة سبب وزر إصلاح مقترح."
              count={filteredIntervention.length}
              tone="danger"
              icon={<AlertTriangle size={15} />}
            >
              {filteredIntervention.length === 0 ? (
                <Empty icon={<CheckCircle2 size={28} />} text={q ? "لا توجد نتائج" : "كل الحسابات سليمة 🎉"} />
              ) : (
                <ul className="divide-y divide-white/[0.05]">
                  {filteredIntervention.map((p) => (
                    <li key={p.member_id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="text-white text-[14px] font-semibold">{p.full_name}</span>
                            <span className="text-white/40 text-[12px]" dir="ltr">{p.phone ?? "—"}</span>
                          </div>
                          <ReasonPill text={p.reason_text} tone={reasonTone(p.reason)} />
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                          {p.suggested_action === "auto_activate" && (
                            <Btn icon={<UserCheck size={12} />} tone="primary" busy={busyId === p.member_id} onClick={() => autoActivate(p)}>
                              تفعيل تلقائي
                            </Btn>
                          )}
                          {p.suggested_action === "create_sub" && (
                            <Link href={`/reception/create?phone=${encodeURIComponent(p.phone ?? "")}`}
                              className="inline-flex items-center gap-1.5 h-8 px-3 border border-[#4ECDC4]/30 bg-[#4ECDC4]/10 text-[#4ECDC4] hover:bg-[#4ECDC4]/20 text-[11px] font-medium">
                              <UserPlus size={12} /> إنشاء اشتراك
                            </Link>
                          )}
                          {p.suggested_action === "renew" && (
                            <Tag icon={<PhoneCall size={11} />} tone="gold">يحتاج تجديد بالاستقبال</Tag>
                          )}
                          {p.suggested_action === "rebind" && (
                            <Tag tone="orange">كود مأخوذ — راجع الكود</Tag>
                          )}
                          <Btn icon={<KeyRound size={12} />} tone="ghost" busy={busyId === p.member_id} onClick={() => resetPassword(p.member_id, p.full_name)}>
                            كلمة مرور
                          </Btn>
                          <Btn icon={<Trash2 size={12} />} tone="danger" busy={busyId === p.member_id} onClick={() => deleteMember(p.member_id, p.full_name)}>
                            حذف
                          </Btn>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section
              title="ملفات شخصية مفقودة"
              subtitle="حسابات مفعّلة لكن ملفها الشخصي غير موجود — يظهرون بشكل غير سليم للكوتش."
              count={filteredMissing.length}
              tone="orange"
              icon={<AlertTriangle size={15} />}
            >
              {filteredMissing.length === 0 ? (
                <Empty icon={<CheckCircle2 size={28} />} text="كل الملفات سليمة." />
              ) : (
                <>
                  <div className="mb-3 flex justify-end">
                    <button type="button" onClick={restoreAllMissing} disabled={bulkRunning}
                      className="inline-flex items-center gap-1.5 h-8 px-3 border border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 text-[11px] font-medium disabled:opacity-50">
                      <Sparkles size={12} /> استعادة الكل ({filteredMissing.length})
                    </button>
                  </div>
                  <ul className="divide-y divide-white/[0.05]">
                    {filteredMissing.map((m) => (
                      <li key={m.member_id} className="py-2.5 first:pt-0 flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <span className="text-white/85 text-[13px]">{m.full_name}</span>
                          <span className="text-white/35 text-[11px] mr-2" dir="ltr">{m.phone ?? "—"} · code={m.activation_code} · ends {m.end_date}</span>
                        </div>
                        <Btn icon={<UserCheck size={11} />} tone="primary" busy={busyId === m.member_id} onClick={() => restoreProfile(m.member_id, m.full_name)} size="sm">
                          استعادة الملف
                        </Btn>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Section>

            <Section
              title="حسابات مكررة"
              subtitle="نفس رقم الهاتف عبر أكثر من حساب — اختر السجل الصحيح واحذف الزائد."
              count={filteredDuplicates.length}
              tone="gold"
              icon={<Users size={15} />}
            >
              {filteredDuplicates.length === 0 ? (
                <Empty icon={<CheckCircle2 size={28} />} text="لا حسابات مكررة." />
              ) : (
                <div className="space-y-3">
                  {filteredDuplicates.map((group) => (
                    <div key={group.phone_normalized} className="border border-white/[0.06] bg-black/15 p-3">
                      <p className="text-white/50 text-[11px] font-mono mb-2.5" dir="ltr">📞 {group.phone_display}</p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {group.rows.map((r) => (
                          <div key={r.member_id} className="border border-white/[0.06] bg-iron/60 px-3 py-2 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-white text-[13px] truncate">{r.full_name}</p>
                              <p className="text-white/35 text-[11px] mt-0.5">
                                {r.kind === "app"
                                  ? <span className="text-emerald-300/85">✓ حساب تطبيق</span>
                                  : <span className="text-white/40">سجل استقبال</span>}
                                <span className="mx-1 text-white/20">·</span>
                                {r.created_at?.slice(0, 10)}
                              </p>
                            </div>
                            <Btn icon={<Trash2 size={11} />} tone="danger" busy={busyId === r.member_id} onClick={() => deleteMember(r.member_id, r.full_name)} size="sm">
                              حذف
                            </Btn>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section
              title="اشتراكات معلّقة"
              subtitle="اشتراكات في الاستقبال لها حساب تطبيق مطابق ولكن لم تُربط بعد."
              count={filteredOrphans.length}
              tone="blue"
              icon={<Link2 size={15} />}
            >
              {filteredOrphans.length === 0 ? (
                <Empty icon={<CheckCircle2 size={28} />} text="كل الاشتراكات مربوطة." />
              ) : (
                <ul className="divide-y divide-white/[0.05]">
                  {filteredOrphans.map((s) => (
                    <li key={s.sub_id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-[13px] mb-1">
                            <span className="text-white/60">{s.member_name}</span>
                            <span className="text-white/30 mx-1.5">↔</span>
                            <span>{s.matching_full_name}</span>
                          </p>
                          <p className="text-white/40 text-[11px] font-mono" dir="ltr">
                            {s.phone ?? "—"} · <span className="text-blue-300">{s.activation_code}</span> · ${s.amount ?? "—"} · ends {s.end_date}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Btn icon={<Link2 size={12} />} tone="primary" busy={busyId === s.sub_id} onClick={() => linkOrphan(s)}>
                            ربط الآن
                          </Btn>
                          <Btn icon={<XCircle size={12} />} tone="danger" busy={busyId === s.sub_id} onClick={() => cancelSub(s.sub_id, `${s.member_name} / ${s.activation_code}`)}>
                            إلغاء
                          </Btn>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section
              title="اشتراكات منتهية"
              subtitle="حسابات فعّالة سابقاً لكن انتهى اشتراكها — تحتاج تجديد من لوحة الاستقبال الرئيسية."
              count={filteredExpired.length}
              tone="muted"
              icon={<Inbox size={15} />}
            >
              {filteredExpired.length === 0 ? (
                <Empty icon={<CheckCircle2 size={28} />} text="لا توجد اشتراكات منتهية." />
              ) : (
                <ul className="divide-y divide-white/[0.05]">
                  {filteredExpired.map((e) => (
                    <li key={e.sub_id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <span className="text-white/85 text-[13px]">{e.full_name}</span>
                        <span className="text-white/35 text-[11px] mr-2" dir="ltr">{e.phone ?? "—"}</span>
                        <Tag tone="gold" small>انتهى {e.ended_on}</Tag>
                      </div>
                      <Btn icon={<XCircle size={11} />} tone="danger" busy={busyId === e.sub_id} onClick={() => cancelSub(e.sub_id, `${e.full_name} / ${e.activation_code}`)} size="sm">
                        إلغاء الاشتراك
                      </Btn>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section
              title="كل اللاعبين"
              subtitle="إدارة سريعة لكل لاعب — تفعيل، إيقاف، إعادة كلمة المرور، حذف."
              count={filteredAll.length}
              tone="teal"
              icon={<Users size={15} />}
              defaultOpen
            >
              {filteredAll.length === 0 ? (
                <Empty icon={<Inbox size={28} />} text={q ? "لا توجد نتائج للبحث" : "لا يوجد لاعبون."} />
              ) : (
                <ul className="divide-y divide-white/[0.05]">
                  {filteredAll.slice(0, 200).map((p) => (
                    <li key={p.member_id} className="py-2.5 first:pt-0 flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white/90 text-[13px]">{p.full_name}</span>
                          <span className="text-white/35 text-[11px]" dir="ltr">{p.phone ?? "—"}</span>
                          {p.status === "suspended" && <Tag tone="danger" small>موقوف</Tag>}
                          {p.has_live_sub ? (
                            <Tag tone="emerald" small>مفعّل · <span dir="ltr">{p.current_code}</span></Tag>
                          ) : (
                            <Tag tone="muted" small>غير مفعّل</Tag>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Btn icon={<Pencil size={11} />} tone="ghost" busy={busyId === p.member_id} onClick={() => editMember(p.member_id, p.full_name, p.phone)} size="sm">
                          تعديل
                        </Btn>
                        {p.has_live_sub && p.sub_id && (
                          <Btn icon={<CalendarPlus size={11} />} tone="ghost" busy={busyId === p.sub_id} onClick={() => extendSub(p.sub_id!, p.sub_end_date, p.current_code ?? "—")} size="sm">
                            تمديد
                          </Btn>
                        )}
                        {p.has_live_sub && p.sub_id && (
                          <Btn icon={<Unlink size={11} />} tone="ghost" busy={busyId === p.sub_id} onClick={() => unbindSub(p.sub_id!, p.current_code ?? "—")} size="sm">
                            فك الربط
                          </Btn>
                        )}
                        <Btn icon={<KeyRound size={11} />} tone="ghost" busy={busyId === p.member_id} onClick={() => resetPassword(p.member_id, p.full_name)} size="sm">
                          كلمة مرور
                        </Btn>
                        <Btn
                          icon={p.status === "suspended" ? <Power size={11} /> : <Ban size={11} />}
                          tone={p.status === "suspended" ? "primary" : "warn"}
                          busy={busyId === p.member_id}
                          onClick={() => toggleStatus(p.member_id, p.status, p.full_name)}
                          size="sm"
                        >
                          {p.status === "suspended" ? "تفعيل" : "إيقاف"}
                        </Btn>
                        <Btn icon={<Trash2 size={11} />} tone="danger" busy={busyId === p.member_id} onClick={() => deleteMember(p.member_id, p.full_name)} size="sm">
                          حذف
                        </Btn>
                      </div>
                    </li>
                  ))}
                  {filteredAll.length > 200 && (
                    <li className="py-3 text-center text-white/30 text-[11px]">عرض أول 200 — ابحث لتصفية المزيد.</li>
                  )}
                </ul>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function reasonTone(reason: string): "danger" | "gold" | "blue" | "muted" | "orange" {
  if (reason === "expired_bound")    return "gold";
  if (reason === "code_stolen")      return "orange";
  if (reason === "no_code_entered")  return "blue";
  if (reason === "no_dashboard_sub") return "muted";
  if (reason === "no_app_registration") return "muted";
  if (reason === "duplicate")        return "danger";
  return "muted";
}

// ── Subcomponents ──────────────────────────────────────────────

function StatCard({ label, value, total, tone }: { label: string; value: number; total: number; tone: "danger" | "gold" | "blue" | "muted" | "teal" | "orange" }) {
  const tones = {
    danger: { box: "border-danger/20 bg-danger/[0.05]",       num: "text-danger" },
    gold:   { box: "border-gold/20 bg-gold/[0.05]",           num: "text-gold" },
    blue:   { box: "border-blue-400/20 bg-blue-400/[0.05]",   num: "text-blue-300" },
    muted:  { box: "border-white/[0.06] bg-white/[0.02]",     num: "text-white/70" },
    teal:   { box: "border-[#4ECDC4]/20 bg-[#4ECDC4]/[0.05]", num: "text-[#4ECDC4]" },
    orange: { box: "border-orange-500/20 bg-orange-500/[0.05]", num: "text-orange-300" },
  }[tone];
  const isFiltered = value !== total;
  return (
    <div className={cn("border px-3 py-2.5", tones.box)}>
      <div className="flex items-baseline gap-1.5">
        <p className={cn("text-[22px] font-display leading-none", tones.num)}>{value}</p>
        {isFiltered && <p className="text-white/30 text-[11px]" dir="ltr">/ {total}</p>}
      </div>
      <p className="text-white/45 text-[10px] font-mono uppercase tracking-[0.12em] mt-1.5 truncate">{label}</p>
    </div>
  );
}

function Section({
  title, subtitle, count, tone, icon, children, defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  count: number;
  tone: "danger" | "gold" | "blue" | "muted" | "teal" | "orange";
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const isEmpty = count === 0;
  const tones = {
    danger: "text-danger border-danger/15",
    gold:   "text-gold border-gold/15",
    blue:   "text-blue-300 border-blue-400/15",
    muted:  "text-white/60 border-white/[0.08]",
    teal:   "text-[#4ECDC4] border-[#4ECDC4]/15",
    orange: "text-orange-300 border-orange-500/15",
  }[tone];
  return (
    <details open={defaultOpen || !isEmpty} className={cn("border bg-white/[0.02] group", tones)}>
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
        <span className={tones}>{icon}</span>
        <div className="flex-1 min-w-0">
          <h2 className="text-white text-[14px] font-semibold flex items-center gap-2">
            {title}
            <span className={cn("inline-flex items-center justify-center min-w-[22px] h-[20px] px-1.5 text-[11px] font-mono", tones, "bg-current/10 border border-current/20")}>
              <span className={tones.split(" ")[0]}>{count}</span>
            </span>
          </h2>
          {subtitle && <p className="text-white/40 text-[11px] mt-0.5 leading-snug">{subtitle}</p>}
        </div>
        <span className="text-white/30 text-[11px] group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <div className="px-4 pb-4 pt-1">{children}</div>
    </details>
  );
}

// ── Advanced Tools: code lookup + manual bind code → member ───────
function AdvancedTools({ onAction }: { onAction: () => void }) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [binding, setBinding] = useState(false);

  type LookupResult = {
    code: string;
    subs: Array<{
      id: string;
      member_name: string;
      phone: string | null;
      amount: number | null;
      activation_code: string;
      activated_user_id: string | null;
      cancelled_at: string | null;
      end_date: string;
    }>;
    claimed_by: {
      auth_id: string;
      member_id: string | null;
      member_name: string | null;
      member_phone: string | null;
      profile_full_name: string | null;
      profile_phone: string | null;
      profile_active: boolean | null;
    } | null;
  };

  async function lookup() {
    if (!code.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/reception/lookup-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toastError("فشل البحث", String(json.error ?? "")); return; }
      setResult(json.data);
    } finally { setSearching(false); }
  }

  async function bindToMember(subId: string) {
    if (!memberId.trim()) { toastError("أدخل رقم الحساب (member_id)", ""); return; }
    setBinding(true);
    try {
      const res = await fetch("/api/reception/move-sub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sub_id: subId, target_member_id: memberId.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toastError("فشل الربط", String(json.error ?? "")); return; }
      toastSuccess("تم الربط", "");
      onAction();
      lookup();
    } finally { setBinding(false); }
  }

  async function unbindSub(subId: string) {
    if (!window.confirm("فك ربط هذا الاشتراك؟ سيصبح الكود قابلاً للمطالبة مجدداً.")) return;
    const res = await fetch("/api/reception/unbind-sub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sub_id: subId }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) { toastError("فشل فك الربط", String(json.error ?? "")); return; }
    toastSuccess("تم فك الربط", "");
    onAction();
    lookup();
  }

  return (
    <details className="border border-[#4ECDC4]/15 bg-[#4ECDC4]/[0.025]">
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
        <Sparkles size={15} className="text-[#4ECDC4]" />
        <div className="flex-1">
          <h2 className="text-white text-[14px] font-semibold">أدوات متقدمة</h2>
          <p className="text-white/40 text-[11px] mt-0.5">ابحث بالكود، اربط أي كود بأي حساب يدوياً، فك ربط الأكواد.</p>
        </div>
        <span className="text-white/30 text-[11px]">▾</span>
      </summary>
      <div className="p-4 space-y-4">
        {/* Code lookup */}
        <div>
          <p className="text-white/50 text-[11px] mb-1.5">ابحث بالكود:</p>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="مثال: AB123456"
              dir="ltr"
              onKeyDown={(e) => { if (e.key === "Enter") lookup(); }}
              className="flex-1 h-9 px-3 bg-iron border border-steel text-white text-[13px] placeholder:text-white/30 focus:border-[#4ECDC4]/50 focus:outline-none"
            />
            <button type="button" onClick={lookup} disabled={searching || !code.trim()}
              className="inline-flex items-center gap-1.5 h-9 px-3 bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 text-void text-[12px] font-bold disabled:opacity-50">
              <Search size={12} /> {searching ? "..." : "بحث"}
            </button>
          </div>

          {result && (
            <div className="mt-3 border border-white/[0.08] bg-black/20 p-3 space-y-3 text-[12px]">
              {result.subs.length === 0 ? (
                <p className="text-white/40">لا يوجد اشتراك بهذا الكود.</p>
              ) : (
                <>
                  <p className="text-white/55">{result.subs.length} اشتراك بهذا الكود:</p>
                  {result.subs.map((s) => (
                    <div key={s.id} className="border border-white/[0.06] bg-white/[0.02] p-2 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-white/90">{s.member_name}</span>
                        <span className={cn(s.cancelled_at ? "text-red-300" : (s.end_date < new Date().toISOString().slice(0,10) ? "text-white/40" : "text-emerald-300"), "text-[11px]")}>
                          {s.cancelled_at ? "ملغى" : (s.end_date < new Date().toISOString().slice(0,10) ? "منتهي" : "حي")}
                        </span>
                      </div>
                      <p className="text-white/40 text-[11px]" dir="ltr">{s.phone ?? "—"} · ${s.amount ?? "—"} · ends {s.end_date}</p>
                      <p className="text-white/40 text-[11px]">
                        {s.activated_user_id
                          ? <>مُربط بـ <span className="text-blue-300" dir="ltr">{s.activated_user_id.slice(0,8)}…</span></>
                          : <span className="text-white/30">غير مربوط (حر)</span>}
                      </p>
                      {!s.cancelled_at && (
                        <div className="flex gap-1.5 pt-1">
                          {s.activated_user_id && (
                            <button type="button" onClick={() => unbindSub(s.id)}
                              className="inline-flex items-center gap-1 h-7 px-2 border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 text-[10px]">
                              فك الربط
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {result.claimed_by && (
                    <div className="border border-blue-400/15 bg-blue-400/[0.04] p-2 mt-2 text-[11px]">
                      <p className="text-blue-300/80 font-bold mb-1">الحساب المربوط:</p>
                      <p className="text-white/70">{result.claimed_by.profile_full_name ?? result.claimed_by.member_name ?? "—"}</p>
                      <p className="text-white/40" dir="ltr">{result.claimed_by.member_phone ?? "—"}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Manual bind */}
        <div className="border-t border-white/[0.06] pt-4">
          <p className="text-white/50 text-[11px] mb-1.5">ربط الكود (من نتيجة البحث أعلاه) بحساب آخر:</p>
          <div className="flex gap-2">
            <input value={memberId} onChange={(e) => setMemberId(e.target.value)}
              placeholder={`member_id (انسخه من قسم "كل اللاعبين")`}
              dir="ltr"
              className="flex-1 h-9 px-3 bg-iron border border-steel text-white text-[12px] placeholder:text-white/30 focus:border-[#4ECDC4]/50 focus:outline-none"
            />
          </div>
          <p className="text-white/30 text-[10px] mt-1">يطبّق على أول اشتراك في نتيجة البحث. للربط بحساب آخر، استخدم زر «ربط» بجانب كل اشتراك.</p>
          {result?.subs?.[0] && (
            <button type="button" onClick={() => bindToMember(result.subs[0].id)} disabled={binding || !memberId.trim()}
              className="mt-2 inline-flex items-center gap-1.5 h-8 px-3 bg-blue-400/15 border border-blue-400/30 text-blue-300 hover:bg-blue-400/25 text-[11px] disabled:opacity-50">
              <Link2 size={11} /> {binding ? "..." : "ربط بهذا الحساب"}
            </button>
          )}
        </div>
      </div>
    </details>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="py-8 flex flex-col items-center justify-center gap-2 text-white/30">
      <div className="text-white/15">{icon}</div>
      <p className="text-[12px]">{text}</p>
    </div>
  );
}

function ReasonPill({ text, tone }: { text: string; tone: "danger" | "gold" | "blue" | "muted" | "orange" }) {
  const tones = {
    danger: "bg-danger/10 border-danger/25 text-danger/95",
    gold:   "bg-gold/10 border-gold/25 text-gold",
    blue:   "bg-blue-400/10 border-blue-400/25 text-blue-300",
    muted:  "bg-white/[0.04] border-white/[0.12] text-white/60",
    orange: "bg-orange-500/10 border-orange-500/25 text-orange-300",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 border px-2 py-1 text-[11px] leading-none", tones)}>
      <AlertTriangle size={11} />
      {text}
    </span>
  );
}

function Tag({ children, tone, icon, small = false }: { children: React.ReactNode; tone: "gold" | "orange" | "emerald" | "muted" | "danger"; icon?: React.ReactNode; small?: boolean }) {
  const tones = {
    gold:    "bg-gold/10 border-gold/25 text-gold",
    orange:  "bg-orange-500/10 border-orange-500/30 text-orange-300",
    emerald: "bg-emerald-500/10 border-emerald-500/25 text-emerald-300",
    muted:   "bg-white/[0.04] border-white/[0.1] text-white/55",
    danger:  "bg-red-500/10 border-red-500/30 text-red-300",
  }[tone];
  const padding = small ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]";
  return (
    <span className={cn("inline-flex items-center gap-1 border leading-none", tones, padding)}>
      {icon}
      {children}
    </span>
  );
}

function Btn({
  icon, tone, busy, onClick, children, size = "md",
}: {
  icon: React.ReactNode;
  tone: "primary" | "danger" | "ghost" | "warn";
  busy: boolean;
  onClick: () => void;
  children: React.ReactNode;
  size?: "sm" | "md";
}) {
  const tones = {
    primary: "bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 text-void border border-[#4ECDC4]",
    danger:  "bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30",
    ghost:   "bg-white/[0.04] hover:bg-white/[0.08] text-white/75 border border-white/[0.08]",
    warn:    "bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30",
  }[tone];
  const sizes = size === "sm" ? "h-7 px-2.5 text-[10.5px]" : "h-8 px-3 text-[11px]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn("inline-flex items-center gap-1.5 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap", tones, sizes)}
    >
      {icon}
      {children}
    </button>
  );
}

function IconButton({ children, onClick, disabled, title }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center justify-center w-9 h-9 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-white/70 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function SkeletonSections() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-white/[0.06] bg-white/[0.02] p-4 animate-pulse">
          <div className="h-4 w-1/3 bg-white/[0.06] mb-3" />
          <div className="space-y-2">
            <div className="h-10 bg-white/[0.04]" />
            <div className="h-10 bg-white/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  );
}
