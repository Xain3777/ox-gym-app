"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  User,
  UtensilsCrossed,
  X,
  Phone,
  MessageCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type {
  MealProgramTemplate,
  MealTemplateDay,
  MealTemplateMeal,
} from "@/lib/meal-programs";
import { MEAL_SLOT_LABELS_AR } from "@/lib/meal-programs";

type PlayerOption = {
  id: string;
  full_name: string;
  phone: string | null;
  eligible?: boolean;
};

type ConsultationRequest = {
  id: string;
  member_id: string;
  member_name: string | null;
  member_phone: string | null;
  note: string | null;
  status: "pending" | "contacted" | "closed";
  created_at: string;
  updated_at: string;
};

type EditorState =
  | { type: "program"; program: MealProgramTemplate }
  | { type: "day"; day: MealTemplateDay; templateId: string }
  | { type: "meal"; meal: MealTemplateMeal; dayId: string; templateId: string }
  | null;

type AddDayState = { program: MealProgramTemplate } | null;
type AddMealState = { program: MealProgramTemplate; day: MealTemplateDay } | null;

const MEAL_SLOT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "breakfast",   label: "الفطور" },
  { value: "lunch",       label: "الغداء" },
  { value: "dinner",      label: "العشاء" },
  { value: "post_workout", label: "وجبة ما بعد التمرين" },
  { value: "pre_workout",  label: "وجبة ما قبل التمرين" },
  { value: "snack",       label: "وجبة خفيفة" },
  { value: "meal",        label: "وجبة" },
];

export default function CoachMealsPage() {
  const { success, error: toastError } = useToast();
  const [programs, setPrograms] = useState<MealProgramTemplate[]>([]);
  const [requests, setRequests] = useState<ConsultationRequest[]>([]);
  const [showClosed, setShowClosed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<EditorState>(null);
  const [creatingProgram, setCreatingProgram] = useState(false);
  const [addingDay, setAddingDay] = useState<AddDayState>(null);
  const [addingMeal, setAddingMeal] = useState<AddMealState>(null);
  const [assigningProgram, setAssigningProgram] = useState<MealProgramTemplate | null>(null);
  const [deletingProgram, setDeletingProgram] = useState<MealProgramTemplate | null>(null);

  async function loadPrograms() {
    const res = await fetch("/api/coach/meal-programs");
    const json = await res.json();
    if (!res.ok || !json.success) {
      toastError("فشل تحميل البرامج", json.error ?? "حاول مرة أخرى.");
      return;
    }
    setPrograms(json.data ?? []);
  }

  async function loadRequests() {
    const res = await fetch("/api/coach/meal-consultation-requests");
    const json = await res.json();
    if (!res.ok || !json.success) return;
    setRequests(json.data ?? []);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { await Promise.all([loadPrograms(), loadRequests()]); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleRequests = useMemo(() => {
    return showClosed ? requests : requests.filter((r) => r.status !== "closed");
  }, [requests, showClosed]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  function toggleProgram(id: string) {
    setExpanded((prev) => toggleSetValue(prev, id));
  }

  function toggleDay(id: string) {
    setExpandedDays((prev) => toggleSetValue(prev, id));
  }

  async function updateRequestStatus(id: string, status: ConsultationRequest["status"]) {
    const res = await fetch("/api/coach/meal-consultation-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toastError("فشل التحديث", json.error ?? "حاول مرة أخرى.");
      return;
    }
    await loadRequests();
  }

  async function deleteDay(id: string) {
    if (!window.confirm("حذف هذا اليوم وجميع وجباته؟")) return;
    const res = await fetch("/api/coach/meal-programs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "day", id }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) { toastError("فشل الحذف", json.error ?? ""); return; }
    await loadPrograms();
    success("تم الحذف", "تم حذف اليوم.");
  }

  async function deleteMeal(id: string) {
    if (!window.confirm("حذف هذه الوجبة؟")) return;
    const res = await fetch("/api/coach/meal-programs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "meal", id }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) { toastError("فشل الحذف", json.error ?? ""); return; }
    await loadPrograms();
    success("تم الحذف", "تم حذف الوجبة.");
  }

  async function deleteProgram(id: string) {
    const res = await fetch("/api/coach/meal-programs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "program", id }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) { toastError("فشل الحذف", json.error ?? ""); return; }
    setDeletingProgram(null);
    await loadPrograms();
    success("تم الحذف", "تم حذف البرنامج.");
  }

  return (
    <div className="p-5 md:p-6 pb-24 md:pb-6 max-w-7xl mx-auto space-y-5" dir="rtl">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-emerald-400 text-[10px] font-mono uppercase tracking-[0.16em]">OX NUTRITION LIBRARY</p>
          <h1 className="font-display text-[30px] tracking-wider text-white mt-1">برامج التغذية</h1>
          <p className="text-white/40 text-[13px] mt-1">إدارة الخطط الغذائية، الأيام، الوجبات، وطلبات الاستشارة.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCreatingProgram(true)}
            className="inline-flex items-center gap-2 bg-emerald-500 text-void px-4 py-3 text-[13px] font-bold hover:bg-emerald-400 transition-colors"
          >
            <Plus size={16} />
            + برنامج غذائي جديد
          </button>
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-left" dir="ltr">
            <p className="text-emerald-300 text-[24px] font-display leading-none">{programs.length}</p>
            <p className="text-white/40 text-[10px] font-mono uppercase tracking-[0.14em] mt-1">Programs</p>
          </div>
        </div>
      </header>

      {/* Consultation Requests Panel */}
      <section className="border border-emerald-500/20 bg-emerald-500/[0.04]">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-emerald-500/15">
          <div className="flex items-center gap-3">
            <h2 className="text-white text-[16px] font-semibold">طلبات الاستشارة الغذائية</h2>
            {pendingCount > 0 && (
              <span className="bg-emerald-500 text-void text-[11px] font-bold px-2 py-0.5">
                {pendingCount} جديد
              </span>
            )}
          </div>
          <label className="flex items-center gap-2 text-white/50 text-[12px]">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(e) => setShowClosed(e.target.checked)}
              className="accent-emerald-500"
            />
            إظهار المغلقة
          </label>
        </div>

        {loading ? (
          <div className="p-6 text-center text-white/35 text-[13px]">جاري التحميل...</div>
        ) : visibleRequests.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle size={32} className="mx-auto text-white/15 mb-3" />
            <p className="text-white/40 text-[13px]">لا توجد طلبات استشارة حالياً.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {visibleRequests.map((r) => (
              <li key={r.id} className={cn(
                "p-4 flex flex-col md:flex-row md:items-center gap-3",
                r.status === "contacted" && "opacity-60",
                r.status === "closed" && "opacity-40",
              )}>
                <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <User size={15} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white text-[13px] font-semibold">{r.member_name ?? "—"}</p>
                    {r.member_phone && <span className="text-white/40 text-[12px]" dir="ltr">{r.member_phone}</span>}
                    <StatusBadge status={r.status} />
                  </div>
                  {r.note && <p className="text-white/55 text-[12px] mt-1 leading-relaxed">{r.note}</p>}
                  <p className="text-white/25 text-[10px] mt-1 font-mono">{formatTimeAgo(r.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {r.member_phone && (
                    <>
                      <a
                        href={`tel:${r.member_phone}`}
                        className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] text-white/75 px-2.5 py-1.5 text-[11px] hover:bg-white/[0.08]"
                      >
                        <Phone size={12} /> اتصل
                      </a>
                      <a
                        href={whatsappLink(r.member_phone)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 text-green-300 px-2.5 py-1.5 text-[11px] hover:bg-green-500/20"
                      >
                        <MessageCircle size={12} /> واتساب
                      </a>
                    </>
                  )}
                  {r.status !== "contacted" && (
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(r.id, "contacted")}
                      className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2.5 py-1.5 text-[11px] hover:bg-emerald-500/20"
                    >
                      <CheckCircle size={12} /> تم التواصل
                    </button>
                  )}
                  {r.status !== "closed" && (
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(r.id, "closed")}
                      className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] text-white/55 px-2.5 py-1.5 text-[11px] hover:bg-white/[0.08]"
                    >
                      <XCircle size={12} /> إغلاق
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Programs library */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 border border-white/[0.06] bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : programs.length === 0 ? (
        <div className="border border-white/[0.06] bg-white/[0.03] py-16 text-center">
          <UtensilsCrossed size={42} className="mx-auto text-white/15 mb-4" />
          <p className="text-white/60 text-[14px]">لا توجد برامج. ابدأ بإضافة برنامج غذائي جديد.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {programs.map((program) => {
            const open = expanded.has(program.id);
            const mealCount = program.days.reduce((sum, d) => sum + d.meals.length, 0);
            return (
              <section key={program.id} className="border border-white/[0.07] bg-white/[0.035] overflow-hidden">
                <div className="p-4 md:p-5 flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <UtensilsCrossed size={21} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-white text-[20px] font-semibold">{program.name}</h2>
                      <span className={cn(
                        "border text-[10px] px-2 py-1",
                        program.is_active
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                          : "bg-white/[0.04] border-white/[0.08] text-white/35",
                      )}>
                        {program.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-white/42 text-[12px] mt-1">
                      {program.category} · {program.days.length} أيام · {mealCount} وجبة
                    </p>
                    {program.description && (
                      <p className="text-white/30 text-[12px] mt-2 line-clamp-2">{program.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <IconBtn label="تعديل البرنامج" onClick={() => setEditor({ type: "program", program })}>
                      <Pencil size={15} />
                    </IconBtn>
                    <IconBtn label="تعيين للاعب" onClick={() => setAssigningProgram(program)} accent disabled={!program.is_active}>
                      <Send size={15} />
                    </IconBtn>
                    <IconBtn label="حذف البرنامج" onClick={() => setDeletingProgram(program)} danger>
                      <Trash2 size={15} />
                    </IconBtn>
                    <IconBtn label={open ? "إغلاق" : "فتح"} onClick={() => toggleProgram(program.id)}>
                      <ChevronDown size={17} className={cn("transition-transform", open && "rotate-180")} />
                    </IconBtn>
                  </div>
                </div>

                {open && (
                  <div className="border-t border-white/[0.06] p-4 md:p-5 space-y-3">
                    <button
                      type="button"
                      onClick={() => setAddingDay({ program })}
                      className="w-full border border-dashed border-emerald-500/25 bg-emerald-500/[0.04] text-emerald-300 py-3 text-[13px] font-bold hover:bg-emerald-500/[0.08] transition-colors"
                    >
                      + إضافة يوم
                    </button>
                    {program.days.map((day) => (
                      <DayCard
                        key={day.id}
                        day={day}
                        program={program}
                        expanded={expandedDays.has(day.id)}
                        onToggle={() => toggleDay(day.id)}
                        onEditDay={() => setEditor({ type: "day", day, templateId: program.id })}
                        onDeleteDay={() => deleteDay(day.id)}
                        onAddMeal={() => setAddingMeal({ program, day })}
                        onEditMeal={(meal) => setEditor({ type: "meal", meal, dayId: day.id, templateId: program.id })}
                        onDeleteMeal={(meal) => deleteMeal(meal.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateProgramModal
        open={creatingProgram}
        onClose={() => setCreatingProgram(false)}
        onSaved={async () => { setCreatingProgram(false); await loadPrograms(); success("تم الحفظ", "تم إنشاء البرنامج."); }}
      />
      <EditModal
        editor={editor}
        onClose={() => setEditor(null)}
        onSaved={async () => { setEditor(null); await loadPrograms(); success("تم الحفظ", "تم تحديث البرنامج."); }}
      />
      <AddDayModal
        target={addingDay}
        onClose={() => setAddingDay(null)}
        onSaved={async () => { setAddingDay(null); await loadPrograms(); success("تمت إضافة اليوم", ""); }}
      />
      <AddMealModal
        target={addingMeal}
        onClose={() => setAddingMeal(null)}
        onSaved={async () => { setAddingMeal(null); await loadPrograms(); success("تمت إضافة الوجبة", ""); }}
      />
      <AssignModal
        program={assigningProgram}
        onClose={() => setAssigningProgram(null)}
        onAssigned={(playerName) => {
          success("تم تعيين البرنامج", playerName ? `للاعب ${playerName}` : "");
          setAssigningProgram(null);
        }}
      />
      {deletingProgram && (
        <ModalFrame title="حذف البرنامج" onClose={() => setDeletingProgram(null)}>
          <div className="space-y-4">
            <p className="text-white/70 text-[14px]">
              سيتم حذف <strong className="text-white">{deletingProgram.name}</strong> وكل أيامه ووجباته.
              لا يمكن التراجع.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => deleteProgram(deletingProgram.id)}
                className="flex-1 bg-red-500 text-white py-3 text-[13px] font-bold uppercase tracking-wider hover:bg-red-600 transition-colors"
              >
                حذف نهائي
              </button>
              <button
                type="button"
                onClick={() => setDeletingProgram(null)}
                className="px-5 py-3 border border-white/[0.08] text-white/60 text-[13px] font-bold hover:text-white"
              >
                إلغاء
              </button>
            </div>
          </div>
        </ModalFrame>
      )}
    </div>
  );
}

// ── Day card ─────────────────────────────────────────────────

function DayCard({
  day,
  expanded,
  onToggle,
  onEditDay,
  onDeleteDay,
  onAddMeal,
  onEditMeal,
  onDeleteMeal,
}: {
  day: MealTemplateDay;
  program: MealProgramTemplate;
  expanded: boolean;
  onToggle: () => void;
  onEditDay: () => void;
  onDeleteDay: () => void;
  onAddMeal: () => void;
  onEditMeal: (meal: MealTemplateMeal) => void;
  onDeleteMeal: (meal: MealTemplateMeal) => void;
}) {
  return (
    <article className="border border-white/[0.06] bg-iron/75 overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="w-11 h-11 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-300 flex-shrink-0"
        >
          <UtensilsCrossed size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-white text-[16px] font-semibold">
            {day.day_number ? `اليوم ${day.day_number} · ` : ""}{day.name}
          </h3>
          <p className="text-white/38 text-[12px] mt-1">
            {day.day_type} · {day.meals.length} وجبة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IconBtn label="تعديل اليوم" onClick={onEditDay}>
            <Pencil size={14} />
          </IconBtn>
          <IconBtn label="حذف اليوم" onClick={onDeleteDay} danger>
            <Trash2 size={14} />
          </IconBtn>
          <IconBtn label="إضافة وجبة" onClick={onAddMeal} accent>
            <Plus size={14} />
          </IconBtn>
          <IconBtn label={expanded ? "إغلاق" : "فتح"} onClick={onToggle}>
            <ChevronDown size={16} className={cn("transition-transform", expanded && "rotate-180")} />
          </IconBtn>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-white/[0.06] p-4 space-y-2">
          {day.meals.length === 0 ? (
            <button
              type="button"
              onClick={onAddMeal}
              className="w-full border border-dashed border-emerald-500/25 bg-emerald-500/[0.04] text-emerald-300 py-3 text-[13px] font-bold hover:bg-emerald-500/[0.08] transition-colors"
            >
              + إضافة وجبة
            </button>
          ) : (
            day.meals.map((meal) => (
              <div key={meal.id} className="border border-white/[0.055] bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-emerald-300 text-[11px] font-bold uppercase tracking-[0.12em]">
                        {MEAL_SLOT_LABELS_AR[meal.meal_slot] ?? meal.meal_slot}
                      </p>
                    </div>
                    <p className="text-white/90 text-[14px] font-semibold mt-1">{meal.name}</p>
                    {meal.description && <p className="text-white/55 text-[12px] mt-1.5 leading-relaxed">{meal.description}</p>}
                    {meal.example && (
                      <p className="text-white/40 text-[12px] mt-1.5">
                        <span className="text-emerald-400 font-bold">مثال: </span>{meal.example}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <IconBtn label="تعديل الوجبة" onClick={() => onEditMeal(meal)}>
                      <Pencil size={13} />
                    </IconBtn>
                    <IconBtn label="حذف الوجبة" onClick={() => onDeleteMeal(meal)} danger>
                      <Trash2 size={13} />
                    </IconBtn>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </article>
  );
}

// ── Modals ───────────────────────────────────────────────────

function CreateProgramModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const { error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", gender_focus: "", description: "" });

  useEffect(() => {
    if (!open) return;
    setForm({ name: "", category: "", gender_focus: "", description: "" });
  }, [open]);

  if (!open) return null;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/coach/meal-programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "program",
          name: form.name.trim(),
          category: form.category.trim(),
          gender_focus: form.gender_focus.trim() || null,
          description: form.description.trim() || null,
          is_active: true, // new programs are always created active
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toastError("فشل الحفظ", json.error ?? ""); return; }
      await onSaved();
    } finally { setSaving(false); }
  }

  return (
    <ModalFrame title="+ برنامج غذائي جديد" onClose={onClose}>
      <div className="space-y-3">
        <TextInput label="الاسم" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <TextInput label="الفئة (bulk / cut / custom)" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
        <TextInput label="الجنس المستهدف (اختياري)" value={form.gender_focus} onChange={(v) => setForm({ ...form, gender_focus: v })} />
        <TextArea label="ملاحظات" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
        <button
          type="button"
          onClick={save}
          disabled={saving || !form.name.trim() || !form.category.trim()}
          className="w-full bg-emerald-500 text-void py-3 text-[13px] font-bold uppercase tracking-wider hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? "جار الحفظ" : "حفظ"}
        </button>
      </div>
    </ModalFrame>
  );
}

function EditModal({ editor, onClose, onSaved }: { editor: EditorState; onClose: () => void; onSaved: () => Promise<void> }) {
  const { error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!editor) return;
    if (editor.type === "program") {
      setForm({
        name: editor.program.name,
        category: editor.program.category,
        gender_focus: editor.program.gender_focus ?? "",
        description: editor.program.description ?? "",
        is_active: editor.program.is_active ? "true" : "false",
      });
    }
    if (editor.type === "day") {
      setForm({
        name: editor.day.name,
        day_number: String(editor.day.day_number ?? ""),
        day_type: editor.day.day_type,
        notes: editor.day.notes ?? "",
        sort_order: String(editor.day.sort_order),
      });
    }
    if (editor.type === "meal") {
      setForm({
        meal_slot: editor.meal.meal_slot,
        name: editor.meal.name,
        description: editor.meal.description ?? "",
        example: editor.meal.example ?? "",
        sort_order: String(editor.meal.sort_order),
      });
    }
  }, [editor]);

  if (!editor) return null;
  const e = editor;

  function field(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function save() {
    setSaving(true);
    try {
      let body: Record<string, unknown> = {};
      if (e.type === "program") {
        body = {
          kind: "program",
          id: e.program.id,
          name: form.name.trim(),
          category: form.category.trim(),
          gender_focus: form.gender_focus.trim() || null,
          description: form.description.trim() || null,
          is_active: form.is_active !== "false",
        };
      } else if (e.type === "day") {
        body = {
          kind: "day",
          id: e.day.id,
          name: form.name.trim(),
          day_number: form.day_number ? parseInt(form.day_number, 10) : null,
          day_type: form.day_type || "training",
          notes: form.notes.trim() || null,
          sort_order: form.sort_order ? parseInt(form.sort_order, 10) : undefined,
        };
      } else {
        body = {
          kind: "meal",
          id: e.meal.id,
          meal_slot: form.meal_slot || "meal",
          name: form.name.trim(),
          description: form.description.trim() || null,
          example: form.example.trim() || null,
          sort_order: form.sort_order ? parseInt(form.sort_order, 10) : undefined,
        };
      }

      const res = await fetch("/api/coach/meal-programs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toastError("فشل الحفظ", json.error ?? ""); return; }
      await onSaved();
    } finally { setSaving(false); }
  }

  const title = e.type === "program" ? "تعديل البرنامج" : e.type === "day" ? "تعديل اليوم" : "تعديل الوجبة";

  return (
    <ModalFrame title={title} onClose={onClose}>
      <div className="space-y-3">
        {e.type === "program" && (
          <>
            <TextInput label="الاسم" value={form.name ?? ""} onChange={(v) => field("name", v)} />
            <TextInput label="الفئة" value={form.category ?? ""} onChange={(v) => field("category", v)} />
            <TextInput label="الجنس المستهدف" value={form.gender_focus ?? ""} onChange={(v) => field("gender_focus", v)} />
            <CheckboxInput label="نشط" checked={form.is_active !== "false"} onChange={(c) => field("is_active", c ? "true" : "false")} />
            <TextArea label="ملاحظات" value={form.description ?? ""} onChange={(v) => field("description", v)} />
          </>
        )}
        {e.type === "day" && (
          <>
            <TextInput label="اسم اليوم" value={form.name ?? ""} onChange={(v) => field("name", v)} />
            <div className="grid sm:grid-cols-3 gap-3">
              <TextInput label="رقم اليوم" value={form.day_number ?? ""} onChange={(v) => field("day_number", v)} />
              <SelectInput
                label="النوع"
                value={form.day_type ?? "training"}
                onChange={(v) => field("day_type", v)}
                options={[
                  { value: "training", label: "Training" },
                  { value: "rest",     label: "Rest" },
                  { value: "flexible", label: "Flexible" },
                ]}
              />
              <TextInput label="الترتيب" value={form.sort_order ?? ""} onChange={(v) => field("sort_order", v)} />
            </div>
            <TextArea label="ملاحظات" value={form.notes ?? ""} onChange={(v) => field("notes", v)} />
          </>
        )}
        {e.type === "meal" && (
          <>
            <SelectInput label="فئة الوجبة" value={form.meal_slot ?? "meal"} onChange={(v) => field("meal_slot", v)} options={MEAL_SLOT_OPTIONS} />
            <TextInput label="اسم الوجبة" value={form.name ?? ""} onChange={(v) => field("name", v)} />
            <TextArea label="الوصف" value={form.description ?? ""} onChange={(v) => field("description", v)} />
            <TextArea label="المثال" value={form.example ?? ""} onChange={(v) => field("example", v)} />
            <TextInput label="الترتيب" value={form.sort_order ?? ""} onChange={(v) => field("sort_order", v)} />
          </>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving || !(form.name ?? "").trim()}
          className="w-full bg-emerald-500 text-void py-3 text-[13px] font-bold uppercase tracking-wider hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? "جار الحفظ" : "حفظ التغييرات"}
        </button>
      </div>
    </ModalFrame>
  );
}

function AddDayModal({ target, onClose, onSaved }: { target: AddDayState; onClose: () => void; onSaved: () => Promise<void> }) {
  const { error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", day_number: "", day_type: "training", notes: "", sort_order: "" });

  useEffect(() => {
    if (!target) return;
    const next = target.program.days.length;
    setForm({ name: "", day_number: String(next + 1), day_type: "training", notes: "", sort_order: String(next) });
  }, [target]);

  if (!target) return null;
  const t = target;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/coach/meal-programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "day",
          template_id: t.program.id,
          name: form.name.trim(),
          day_number: form.day_number ? parseInt(form.day_number, 10) : null,
          day_type: form.day_type || "training",
          notes: form.notes.trim() || null,
          sort_order: form.sort_order ? parseInt(form.sort_order, 10) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toastError("فشل الحفظ", json.error ?? ""); return; }
      await onSaved();
    } finally { setSaving(false); }
  }

  return (
    <ModalFrame title="إضافة يوم" onClose={onClose}>
      <div className="space-y-3">
        <div className="bg-iron/70 border border-white/[0.06] p-3">
          <p className="text-white/35 text-[10px] font-mono uppercase tracking-[0.14em]">البرنامج</p>
          <p className="text-white text-[13px] mt-1">{t.program.name}</p>
        </div>
        <TextInput label="اسم اليوم" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <div className="grid sm:grid-cols-3 gap-3">
          <TextInput label="رقم اليوم" value={form.day_number} onChange={(v) => setForm({ ...form, day_number: v })} />
          <SelectInput
            label="النوع"
            value={form.day_type}
            onChange={(v) => setForm({ ...form, day_type: v })}
            options={[
              { value: "training", label: "Training" },
              { value: "rest",     label: "Rest" },
              { value: "flexible", label: "Flexible" },
            ]}
          />
          <TextInput label="الترتيب" value={form.sort_order} onChange={(v) => setForm({ ...form, sort_order: v })} />
        </div>
        <TextArea label="ملاحظات" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        <button
          type="button"
          onClick={save}
          disabled={saving || !form.name.trim()}
          className="w-full bg-emerald-500 text-void py-3 text-[13px] font-bold uppercase tracking-wider hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? "جار الحفظ" : "إنشاء اليوم"}
        </button>
      </div>
    </ModalFrame>
  );
}

function AddMealModal({ target, onClose, onSaved }: { target: AddMealState; onClose: () => void; onSaved: () => Promise<void> }) {
  const { error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ meal_slot: "meal", name: "", description: "", example: "", sort_order: "" });

  useEffect(() => {
    if (!target) return;
    setForm({ meal_slot: "meal", name: "", description: "", example: "", sort_order: String(target.day.meals.length) });
  }, [target]);

  if (!target) return null;
  const t = target;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/coach/meal-programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "meal",
          day_id: t.day.id,
          meal_slot: form.meal_slot || "meal",
          name: form.name.trim(),
          description: form.description.trim() || null,
          example: form.example.trim() || null,
          sort_order: form.sort_order ? parseInt(form.sort_order, 10) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toastError("فشل الحفظ", json.error ?? ""); return; }
      await onSaved();
    } finally { setSaving(false); }
  }

  return (
    <ModalFrame title="إضافة وجبة" onClose={onClose}>
      <div className="space-y-3">
        <div className="bg-iron/70 border border-white/[0.06] p-3">
          <p className="text-white/35 text-[10px] font-mono uppercase tracking-[0.14em]">المستهدف</p>
          <p className="text-white text-[13px] mt-1">{t.program.name} · {t.day.name}</p>
        </div>
        <SelectInput label="فئة الوجبة" value={form.meal_slot} onChange={(v) => setForm({ ...form, meal_slot: v })} options={MEAL_SLOT_OPTIONS} />
        <TextInput label="اسم الوجبة" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <TextArea label="الوصف" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
        <TextArea label="المثال" value={form.example} onChange={(v) => setForm({ ...form, example: v })} />
        <TextInput label="الترتيب" value={form.sort_order} onChange={(v) => setForm({ ...form, sort_order: v })} />
        <button
          type="button"
          onClick={save}
          disabled={saving || !form.name.trim()}
          className="w-full bg-emerald-500 text-void py-3 text-[13px] font-bold uppercase tracking-wider hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? "جار الحفظ" : "إنشاء الوجبة"}
        </button>
      </div>
    </ModalFrame>
  );
}

function AssignModal({
  program,
  onClose,
  onAssigned,
}: {
  program: MealProgramTemplate | null;
  onClose: () => void;
  onAssigned: (playerName?: string) => void;
}) {
  const { error: toastError } = useToast();
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!program) return;
    setSearch("");
    setSelectedId("");
    setLoading(true);
    fetch("/api/coach/players")
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error ?? "Failed to load players");
        setPlayers(json.data ?? []);
      })
      .catch((err) => toastError("فشل تحميل اللاعبين", err instanceof Error ? err.message : ""))
      .finally(() => setLoading(false));
  }, [program, toastError]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = players.filter((p) => p.eligible !== false);
    if (!q) return base;
    return base.filter((p) =>
      p.full_name?.toLowerCase().includes(q)
      || (p.phone?.toLowerCase().includes(q) ?? false),
    );
  }, [players, search]);

  const selected = players.find((p) => p.id === selectedId) ?? null;

  if (!program) return null;

  async function assign() {
    if (!program || !selectedId) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/coach/meal-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: selectedId, template_id: program.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toastError("فشل التعيين", json.error ?? ""); return; }
      onAssigned(selected?.full_name);
    } finally { setAssigning(false); }
  }

  return (
    <ModalFrame title="تعيين برنامج غذائي للاعب" onClose={onClose} wide>
      <div className="grid md:grid-cols-[1fr_280px] gap-4">
        <section className="space-y-3">
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن لاعب بالاسم أو الهاتف"
              className="w-full h-11 pr-10 pl-3 bg-iron border border-steel text-white text-[13px] placeholder:text-white/25 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
          <div className="max-h-[360px] overflow-y-auto space-y-2">
            {loading ? (
              <p className="text-white/35 text-[13px] text-center py-10">جار التحميل...</p>
            ) : filtered.length === 0 ? (
              <p className="text-white/35 text-[13px] text-center py-10">لا يوجد لاعبون مفعّلون.</p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 text-right border transition-colors",
                    selectedId === p.id
                      ? "bg-emerald-500/10 border-emerald-500/35"
                      : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]",
                  )}
                >
                  <div className="w-9 h-9 bg-emerald-500/10 text-emerald-300 flex items-center justify-center flex-shrink-0">
                    <User size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[13px] font-semibold truncate">{p.full_name}</p>
                    <p className="text-white/35 text-[11px] truncate">{p.phone ?? "بدون هاتف"}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <aside className="bg-iron/80 border border-white/[0.06] p-4 space-y-4">
          <div>
            <p className="text-white/35 text-[10px] font-mono uppercase tracking-[0.14em]">Preview</p>
            <h3 className="text-white text-[18px] font-semibold mt-1">{program.name}</h3>
            <p className="text-white/42 text-[12px] mt-1">{program.category} · {program.days.length} أيام</p>
          </div>
          <div className="border-t border-white/[0.06] pt-4">
            <p className="text-white/35 text-[11px]">اللاعب المختار</p>
            <p className="text-white text-[13px] font-semibold mt-1">{selected?.full_name ?? "لم يتم اختيار لاعب"}</p>
          </div>
          <button
            type="button"
            onClick={assign}
            disabled={!selectedId || assigning}
            className="w-full bg-emerald-500 text-void py-3 text-[13px] font-bold uppercase tracking-wider hover:bg-emerald-400 disabled:opacity-50"
          >
            {assigning ? "جار التعيين" : "تعيين البرنامج"}
          </button>
        </aside>
      </div>
    </ModalFrame>
  );
}

// ── Primitives ───────────────────────────────────────────────

function ModalFrame({
  title, children, onClose, wide = false,
}: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={cn("bg-charcoal border border-white/[0.08] w-full max-h-[86vh] overflow-y-auto", wide ? "max-w-4xl" : "max-w-xl")}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="sticky top-0 z-10 bg-charcoal border-b border-white/[0.06] p-5 flex items-start justify-between gap-4">
          <h2 className="text-white text-[18px] font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white" aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-white/35 text-[11px] font-bold uppercase tracking-[0.12em]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-10 bg-iron border border-steel text-white text-[13px] px-3 focus:border-emerald-500/50 focus:outline-none"
      />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-white/35 text-[11px] font-bold uppercase tracking-[0.12em]">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="mt-1 w-full bg-iron border border-steel text-white text-[13px] p-3 focus:border-emerald-500/50 focus:outline-none"
      />
    </label>
  );
}

function SelectInput({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="block">
      <span className="text-white/35 text-[11px] font-bold uppercase tracking-[0.12em]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-10 bg-iron border border-steel text-white text-[13px] px-3 focus:border-emerald-500/50 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function CheckboxInput({ label, checked, onChange }: { label: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 border border-white/[0.06] bg-white/[0.025] p-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-emerald-500" />
      <span className="text-white/65 text-[13px] font-semibold">{label}</span>
    </label>
  );
}

function IconBtn({
  label, onClick, children, accent, danger, disabled,
}: { label: string; onClick: () => void; children: React.ReactNode; accent?: boolean; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "w-9 h-9 flex items-center justify-center border transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        accent
          ? "bg-emerald-500 border-emerald-500 text-void hover:bg-emerald-400"
          : danger
            ? "border-red-500/20 text-red-300/70 hover:text-red-200 hover:border-red-400/40"
            : "border-white/[0.08] text-white/50 hover:text-white hover:border-white/20",
      )}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: ConsultationRequest["status"] }) {
  const cls = status === "pending"
    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
    : status === "contacted"
      ? "bg-blue-500/10 border-blue-500/25 text-blue-300"
      : "bg-white/[0.05] border-white/[0.1] text-white/40";
  const label = status === "pending" ? "بانتظار" : status === "contacted" ? "تم التواصل" : "مغلق";
  return <span className={cn("border text-[10px] px-2 py-0.5", cls)}>{label}</span>;
}

// ── Utils ────────────────────────────────────────────────────

function toggleSetValue(source: Set<string>, value: string): Set<string> {
  const next = new Set(source);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function whatsappLink(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}`;
}

function formatTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}
