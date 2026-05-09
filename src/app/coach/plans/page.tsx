"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Dumbbell,
  Eye,
  Pencil,
  Plus,
  PlayCircle,
  Search,
  Send,
  Trash2,
  User,
  X,
} from "lucide-react";
import { ExerciseImage } from "@/components/ui/ExerciseImage";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type {
  ExerciseMedia,
  WorkoutProgramTemplate,
  WorkoutTemplateDay,
  WorkoutTemplateExercise,
} from "@/lib/workout-programs";

type PlayerOption = {
  id: string;
  full_name: string;
  phone: string | null;
  current_assignment?: {
    template?: { id: string; name: string; category: string } | null;
  } | null;
};

type EditorState =
  | { type: "program"; program: WorkoutProgramTemplate }
  | { type: "day"; day: WorkoutTemplateDay }
  | { type: "exercise"; exercise: WorkoutTemplateExercise }
  | null;

type AddExerciseState = {
  program: WorkoutProgramTemplate;
  day: WorkoutTemplateDay;
  section: WorkoutTemplateDay["sections"][number] | null;
} | null;

type AddDayState = {
  program: WorkoutProgramTemplate;
} | null;

type MediaSource = {
  name: string;
  url: string;
  type: "machine" | "demo";
};

const emptyMedia: Omit<ExerciseMedia, "id" | "exercise_name"> = {
  machine_name: "",
  machine_image_url: "",
  demo_image_url: "",
  demo_video_url: "",
  instructions: "",
};

export default function CoachPlansPage() {
  const { success, error: toastError } = useToast();
  const [programs, setPrograms] = useState<WorkoutProgramTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<EditorState>(null);
  const [creatingProgram, setCreatingProgram] = useState(false);
  const [addingDay, setAddingDay] = useState<AddDayState>(null);
  const [addingExercise, setAddingExercise] = useState<AddExerciseState>(null);
  const [assigningProgram, setAssigningProgram] = useState<WorkoutProgramTemplate | null>(null);
  const [previewExercise, setPreviewExercise] = useState<WorkoutTemplateExercise | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function loadPrograms() {
    setLoading(true);
    try {
      const res = await fetch("/api/coach/workout-programs");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to load workout programs");
      setPrograms(json.data ?? []);
    } catch (err) {
      toastError("Load failed", err instanceof Error ? err.message : "Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPrograms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleProgram(id: string) {
    setExpandedPrograms((prev) => toggleSetValue(prev, id));
  }

  function toggleDay(id: string) {
    setExpandedDays((prev) => toggleSetValue(prev, id));
  }

  async function deleteItem(kind: "day" | "exercise", id: string) {
    const label = kind === "day" ? "day" : "exercise";
    if (!window.confirm(`Delete this ${label}? This saves directly to Supabase.`)) return;
    setDeleting(`${kind}:${id}`);
    try {
      const res = await fetch("/api/coach/workout-programs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? `Failed to delete ${label}`);
      await loadPrograms();
      success("Deleted", `Workout ${label} deleted.`);
    } catch (err) {
      toastError("Delete failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="p-5 md:p-6 pb-24 md:pb-6 max-w-7xl mx-auto space-y-5" dir="rtl">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[#FF6B35] text-[10px] font-mono uppercase tracking-[0.16em]">OX Training Library</p>
          <h1 className="font-display text-[30px] tracking-wider text-white mt-1">برامج التمارين</h1>
          <p className="text-white/40 text-[13px] mt-1">إدارة البرامج الجاهزة، الأيام، التمارين، وربط فيديوهات وصور الجهاز.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCreatingProgram(true)}
            className="inline-flex items-center gap-2 bg-[#FF6B35] text-void px-4 py-3 text-[13px] font-bold hover:bg-[#FF6B35]/90 transition-colors"
          >
            <Plus size={16} />
            + برنامج جديد
          </button>
          <div className="bg-gold/10 border border-gold/20 px-4 py-3 text-left" dir="ltr">
            <p className="text-gold text-[24px] font-display leading-none">{programs.length}</p>
            <p className="text-white/40 text-[10px] font-mono uppercase tracking-[0.14em] mt-1">Programs</p>
          </div>
        </div>
      </header>

      {loading ? (
        <ProgramSkeleton />
      ) : programs.length === 0 ? (
        <div className="border border-white/[0.06] bg-white/[0.03] py-16 text-center">
          <Dumbbell size={42} className="mx-auto text-white/15 mb-4" />
          <p className="text-white/60 text-[14px]">لم يتم تحميل البرامج. تحقق من تطبيق migration 018 ثم أعد المحاولة.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {programs.map((program) => {
            const expanded = expandedPrograms.has(program.id);
            const exerciseCount = countProgramExercises(program);
            const isStructured = program.source !== "legacy_workout_plans";
            return (
              <section key={program.id} className="border border-white/[0.07] bg-white/[0.035] overflow-hidden">
                <div className="p-4 md:p-5 flex items-start gap-4">
                  <div className="w-12 h-12 bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                    <Dumbbell size={21} className="text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-white text-[20px] font-semibold">{program.name}</h2>
                      {program.gender_focus && (
                        <span className="bg-white/[0.06] border border-white/[0.08] text-white/55 text-[10px] px-2 py-1">
                          {program.gender_focus}
                        </span>
                      )}
                      <span className={cn(
                        "border text-[10px] px-2 py-1",
                        program.is_active ? "bg-gold/10 border-gold/20 text-gold" : "bg-white/[0.04] border-white/[0.08] text-white/35",
                      )}>
                        {program.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-white/42 text-[12px] mt-1">
                      {program.category} · {program.days.length} أيام/نسخ · {exerciseCount} تمرين
                    </p>
                    {program.description && <p className="text-white/30 text-[12px] mt-2 line-clamp-2">{program.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isStructured && (
                      <IconButton label="تعديل البرنامج" onClick={() => setEditor({ type: "program", program })}>
                        <Pencil size={15} />
                      </IconButton>
                    )}
                    <IconButton label="تعيين للاعب" onClick={() => setAssigningProgram(program)} accent disabled={!program.is_active}>
                      <Send size={15} />
                    </IconButton>
                    <IconButton label={expanded ? "إغلاق" : "فتح"} onClick={() => toggleProgram(program.id)}>
                      <ChevronDown size={17} className={cn("transition-transform", expanded && "rotate-180")} />
                    </IconButton>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-white/[0.06] p-4 md:p-5 space-y-3">
                    {isStructured && (
                      <button
                        type="button"
                        onClick={() => setAddingDay({ program })}
                        className="w-full border border-dashed border-gold/25 bg-gold/[0.04] text-gold py-3 text-[13px] font-bold hover:bg-gold/[0.08] transition-colors"
                      >
                        + Add day / variant
                      </button>
                    )}
                    {program.days.map((day) => (
                      <DayCard
                        key={day.id}
                        day={day}
                        program={program}
                        expanded={expandedDays.has(day.id)}
                        onToggle={() => toggleDay(day.id)}
                        onEditDay={() => setEditor({ type: "day", day })}
                        onDeleteDay={() => deleteItem("day", day.id)}
                        onEditExercise={(exercise) => setEditor({ type: "exercise", exercise })}
                        onDeleteExercise={(exercise) => deleteItem("exercise", exercise.id)}
                        onAddExercise={(section) => setAddingExercise({ program, day, section })}
                        onPreviewExercise={setPreviewExercise}
                        deleting={deleting}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <EditModal
        editor={editor}
        onClose={() => setEditor(null)}
        onSaved={async () => {
          setEditor(null);
          await loadPrograms();
          success("تم الحفظ", "تم تحديث مكتبة التمارين.");
        }}
      />

      <CreateProgramModal
        open={creatingProgram}
        onClose={() => setCreatingProgram(false)}
        onSaved={async () => {
          setCreatingProgram(false);
          await loadPrograms();
          success("Program created", "Custom workout program saved to Supabase.");
        }}
      />

      <AddDayModal
        target={addingDay}
        onClose={() => setAddingDay(null)}
        onSaved={async () => {
          setAddingDay(null);
          await loadPrograms();
          success("Day saved", "Workout day saved to Supabase.");
        }}
      />

      <AddExerciseModal
        target={addingExercise}
        onClose={() => setAddingExercise(null)}
        onSaved={async () => {
          setAddingExercise(null);
          await loadPrograms();
          success("تمت إضافة التمرين", "تم حفظ التمرين داخل البرنامج.");
        }}
      />

      <AssignTemplateModal
        program={assigningProgram}
        onClose={() => setAssigningProgram(null)}
        onAssigned={() => {
          success("تم تعيين البرنامج", assigningProgram?.name ?? "Workout program");
          setAssigningProgram(null);
        }}
      />

      <MediaPreviewModal exercise={previewExercise} onClose={() => setPreviewExercise(null)} />
    </div>
  );
}

function DayCard({
  day,
  program,
  expanded,
  onToggle,
  onEditDay,
  onDeleteDay,
  onEditExercise,
  onDeleteExercise,
  onAddExercise,
  onPreviewExercise,
  deleting,
}: {
  day: WorkoutTemplateDay;
  program: WorkoutProgramTemplate;
  expanded: boolean;
  onToggle: () => void;
  onEditDay: () => void;
  onDeleteDay: () => void;
  onEditExercise: (exercise: WorkoutTemplateExercise) => void;
  onDeleteExercise: (exercise: WorkoutTemplateExercise) => void;
  onAddExercise: (section: WorkoutTemplateDay["sections"][number] | null) => void;
  onPreviewExercise: (exercise: WorkoutTemplateExercise) => void;
  deleting: string | null;
}) {
  const exercises = [...day.exercises, ...day.sections.flatMap((section) => section.exercises)];
  const isStructured = program.source !== "legacy_workout_plans";
  return (
    <article className="border border-white/[0.06] bg-iron/75 overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="w-11 h-11 bg-white/[0.05] border border-white/[0.07] flex items-center justify-center text-gold flex-shrink-0"
          aria-label={expanded ? "Close day" : "Open day"}
        >
          <PlayCircle size={19} className={cn("transition-transform", expanded && "rotate-90")} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white text-[16px] font-semibold">
              {day.day_number ? `Day ${day.day_number} · ` : ""}{day.name}
            </h3>
            {canonicalDayType(day.day_type) !== "training" && <AlertTriangle size={15} className="text-gold" />}
          </div>
          <p className="text-white/38 text-[12px] mt-1">
            {canonicalDayType(day.day_type)} · {day.sets_reps ?? "Flexible"} · {exercises.length} تمرين
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStructured && (
            <IconButton label="تعديل اليوم" onClick={onEditDay}>
              <Pencil size={14} />
            </IconButton>
          )}
          {isStructured && (
            <IconButton label="Delete day" onClick={onDeleteDay} danger disabled={deleting === `day:${day.id}`}>
              <Trash2 size={14} />
            </IconButton>
          )}
          {day.sections.length === 0 && (
            <IconButton label="إضافة تمرين" onClick={() => onAddExercise(null)} accent>
              <Plus size={14} />
            </IconButton>
          )}
          <IconButton label={expanded ? "إغلاق" : "فتح"} onClick={onToggle}>
            <ChevronDown size={16} className={cn("transition-transform", expanded && "rotate-180")} />
          </IconButton>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/[0.06] p-4 space-y-4">
          {day.exercises.length > 0 && (
            <ExerciseGrid
              exercises={day.exercises}
              editable={isStructured}
              onEdit={onEditExercise}
              onDelete={onDeleteExercise}
              onPreview={onPreviewExercise}
              deleting={deleting}
            />
          )}
          {day.sections.length === 0 && day.exercises.length === 0 && (
            <button
              type="button"
              onClick={() => onAddExercise(null)}
              className="w-full border border-dashed border-gold/25 bg-gold/[0.04] text-gold py-3 text-[13px] font-bold hover:bg-gold/[0.08] transition-colors"
            >
              إضافة تمرين
            </button>
          )}
          {day.sections.map((section) => (
            <section key={section.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[#FF6B35] text-[12px] font-bold">
                  {section.muscle_group ?? section.name}
                  {section.sets_reps ? ` · ${section.sets_reps}` : ""}
                </p>
                <button
                  type="button"
                  onClick={() => onAddExercise(section)}
                  className="inline-flex items-center gap-1.5 border border-gold/20 bg-gold/[0.06] text-gold px-2.5 py-1.5 text-[11px] font-bold hover:bg-gold/[0.1] transition-colors"
                >
                  <Plus size={13} />
                  إضافة تمرين
                </button>
              </div>
              <ExerciseGrid
                exercises={section.exercises}
                editable={isStructured}
                onEdit={onEditExercise}
                onDelete={onDeleteExercise}
                onPreview={onPreviewExercise}
                deleting={deleting}
              />
            </section>
          ))}
          {day.cardio.length > 0 && (
            <InfoStrip label="Cardio" value={day.cardio.map((item) => `${item.name} ${item.duration}`).join(" · ")} />
          )}
          {day.options.length > 0 && <InfoStrip label="Options" value={day.options.join(" · ")} />}
        </div>
      )}
    </article>
  );
}

function ExerciseGrid({
  exercises,
  editable = true,
  onEdit,
  onDelete,
  onPreview,
  deleting,
}: {
  exercises: WorkoutTemplateExercise[];
  editable?: boolean;
  onEdit: (exercise: WorkoutTemplateExercise) => void;
  onDelete: (exercise: WorkoutTemplateExercise) => void;
  onPreview: (exercise: WorkoutTemplateExercise) => void;
  deleting: string | null;
}) {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
      {exercises.map((exercise) => {
        const hasMedia = Boolean(exercise.media?.demo_image_url || exercise.media?.machine_image_url || exercise.media?.demo_video_url);
        return (
          <div key={exercise.id} className="border border-white/[0.055] bg-white/[0.03] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white/85 text-[13px] font-semibold truncate">{exercise.name}</p>
                <p className="text-gold/75 text-[12px] mt-1">
                  {exercise.duration ?? exercise.sets_reps ?? "بدون تفاصيل"}
                  {exercise.rest ? ` · Rest ${exercise.rest}` : ""}
                </p>
              </div>
              {editable && (
                <div className="flex items-center gap-1">
                  <IconButton label="تعديل التمرين" onClick={() => onEdit(exercise)}>
                    <Pencil size={13} />
                  </IconButton>
                  <IconButton label="Delete exercise" onClick={() => onDelete(exercise)} danger disabled={deleting === `exercise:${exercise.id}`}>
                    <Trash2 size={13} />
                  </IconButton>
                </div>
              )}
            </div>
            {exercise.notes && <p className="text-white/30 text-[11px] mt-2 line-clamp-2">{exercise.notes}</p>}
            <div className="flex items-center justify-between gap-2 mt-3">
              <span className={cn("text-[10px] font-bold uppercase", hasMedia ? "text-gold" : "text-white/25")}>
                {hasMedia ? "Demo linked" : "No demo media"}
              </span>
              <button
                type="button"
                onClick={() => onPreview(exercise)}
                disabled={!hasMedia && !exercise.media?.instructions}
                className="inline-flex items-center gap-1.5 text-[11px] text-white/45 hover:text-gold disabled:opacity-30 disabled:hover:text-white/45 transition-colors"
              >
                <Eye size={13} />
                كيفية استخدام الجهاز
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EditModal({
  editor,
  onClose,
  onSaved,
}: {
  editor: EditorState;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
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
        sets_reps: editor.day.sets_reps ?? "",
        day_type: editor.day.day_type,
        notes: editor.day.notes ?? "",
        sort_order: String(editor.day.sort_order),
      });
    }
    if (editor.type === "exercise") {
      const media = editor.exercise.media ?? emptyMedia;
      setForm({
        name: editor.exercise.name,
        sets_reps: editor.exercise.sets_reps ?? "",
        rest: editor.exercise.rest ?? "",
        duration: editor.exercise.duration ?? "",
        notes: editor.exercise.notes ?? "",
        sort_order: String(editor.exercise.sort_order),
        machine_name: media.machine_name ?? "",
        machine_image_url: media.machine_image_url ?? "",
        demo_image_url: media.demo_image_url ?? "",
        demo_video_url: media.demo_video_url ?? "",
        instructions: media.instructions ?? editor.exercise.instructions ?? "",
      });
    }
  }, [editor]);

  if (!editor) return null;
  const currentEditor = editor;

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const body = buildPatchPayload(currentEditor, form);
      const res = await fetch("/api/coach/workout-programs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError("Save failed", json.error ?? "Please try again.");
        return;
      }
      await onSaved();
    } catch {
      toastError("Network error", "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  const title = editor.type === "program"
    ? "تعديل البرنامج"
    : editor.type === "day"
      ? "تعديل اليوم / النسخة"
      : "تعديل التمرين والوسائط";

  return (
    <ModalFrame title={title} onClose={onClose}>
      <div className="space-y-3">
        <TextInput label="Name" value={form.name ?? ""} onChange={(value) => setField("name", value)} />
        {editor.type === "program" && (
          <>
            <TextInput label="Category" value={form.category ?? ""} onChange={(value) => setField("category", value)} />
            <TextInput label="Gender focus" value={form.gender_focus ?? ""} onChange={(value) => setField("gender_focus", value)} />
            <CheckboxInput label="Active program" checked={form.is_active !== "false"} onChange={(checked) => setField("is_active", checked ? "true" : "false")} />
            <TextArea label="Notes" value={form.description ?? ""} onChange={(value) => setField("description", value)} />
          </>
        )}
        {editor.type === "day" && (
          <>
            <TextInput label="Day number" value={form.day_number ?? ""} onChange={(value) => setField("day_number", value)} />
            <TextInput label="Sets / reps" value={form.sets_reps ?? ""} onChange={(value) => setField("sets_reps", value)} />
            <SelectInput label="Type" value={canonicalDayType(form.day_type)} onChange={(value) => setField("day_type", value)} />
            <TextInput label="Order" value={form.sort_order ?? ""} onChange={(value) => setField("sort_order", value)} />
            <TextArea label="Notes" value={form.notes ?? ""} onChange={(value) => setField("notes", value)} />
          </>
        )}
        {editor.type === "exercise" && (
          <>
            <div className="grid sm:grid-cols-3 gap-3">
              <TextInput label="Sets / reps" value={form.sets_reps ?? ""} onChange={(value) => setField("sets_reps", value)} />
              <TextInput label="Rest" value={form.rest ?? ""} onChange={(value) => setField("rest", value)} />
              <TextInput label="Duration" value={form.duration ?? ""} onChange={(value) => setField("duration", value)} />
            </div>
            <TextInput label="Order" value={form.sort_order ?? ""} onChange={(value) => setField("sort_order", value)} />
            <TextArea label="Exercise notes" value={form.notes ?? ""} onChange={(value) => setField("notes", value)} />
            <MediaFields form={form} exerciseName={form.name ?? ""} setField={setField} />
          </>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving || !(form.name ?? "").trim()}
          className="w-full bg-[#FF6B35] text-void py-3 text-[13px] font-bold uppercase tracking-wider hover:bg-[#FF6B35]/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving" : "Save changes"}
        </button>
      </div>
    </ModalFrame>
  );
}

function CreateProgramModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
    name: "",
    category: "",
    gender_focus: "",
    description: "",
    is_active: "true",
  });

  useEffect(() => {
    if (!open) return;
    setForm({ name: "", category: "", gender_focus: "", description: "", is_active: "true" });
  }, [open]);

  if (!open) return null;

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/coach/workout-programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "program",
          name: form.name.trim(),
          category: form.category.trim(),
          gender_focus: clean(form.gender_focus),
          description: clean(form.description),
          is_active: form.is_active !== "false",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError("Create failed", json.error ?? "Please try again.");
        return;
      }
      await onSaved();
    } catch {
      toastError("Network error", "Could not create program.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalFrame title="+ برنامج جديد" onClose={onClose}>
      <div className="space-y-3">
        <TextInput label="Name" value={form.name ?? ""} onChange={(value) => setField("name", value)} />
        <TextInput label="Category" value={form.category ?? ""} onChange={(value) => setField("category", value)} />
        <TextInput label="Gender focus" value={form.gender_focus ?? ""} onChange={(value) => setField("gender_focus", value)} />
        <CheckboxInput label="Active program" checked={form.is_active !== "false"} onChange={(checked) => setField("is_active", checked ? "true" : "false")} />
        <TextArea label="Notes" value={form.description ?? ""} onChange={(value) => setField("description", value)} />
        <button
          type="button"
          onClick={save}
          disabled={saving || !(form.name ?? "").trim() || !(form.category ?? "").trim()}
          className="w-full bg-[#FF6B35] text-void py-3 text-[13px] font-bold uppercase tracking-wider hover:bg-[#FF6B35]/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving" : "Create program"}
        </button>
      </div>
    </ModalFrame>
  );
}

function AddDayModal({
  target,
  onClose,
  onSaved,
}: {
  target: AddDayState;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!target) return;
    const nextOrder = target.program.days.length;
    setForm({
      name: "",
      day_number: String(nextOrder + 1),
      sets_reps: "",
      day_type: "training",
      notes: "",
      sort_order: String(nextOrder),
    });
  }, [target]);

  if (!target) return null;
  const currentTarget = target;

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/coach/workout-programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "day",
          template_id: currentTarget.program.id,
          name: form.name.trim(),
          day_number: parseNullableNumber(form.day_number),
          sets_reps: clean(form.sets_reps),
          day_type: canonicalDayType(form.day_type),
          notes: clean(form.notes),
          sort_order: parseOrder(form.sort_order),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError("Create failed", json.error ?? "Please try again.");
        return;
      }
      await onSaved();
    } catch {
      toastError("Network error", "Could not create day.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalFrame title="Add day / variant" onClose={onClose}>
      <div className="space-y-3">
        <div className="bg-iron/70 border border-white/[0.06] p-3">
          <p className="text-white/35 text-[10px] font-mono uppercase tracking-[0.14em]">Program</p>
          <p className="text-white text-[13px] mt-1">{currentTarget.program.name}</p>
        </div>
        <TextInput label="Name" value={form.name ?? ""} onChange={(value) => setField("name", value)} />
        <div className="grid sm:grid-cols-3 gap-3">
          <TextInput label="Day number" value={form.day_number ?? ""} onChange={(value) => setField("day_number", value)} />
          <TextInput label="Order" value={form.sort_order ?? ""} onChange={(value) => setField("sort_order", value)} />
          <SelectInput label="Type" value={canonicalDayType(form.day_type)} onChange={(value) => setField("day_type", value)} />
        </div>
        <TextInput label="Default sets / reps" value={form.sets_reps ?? ""} onChange={(value) => setField("sets_reps", value)} />
        <TextArea label="Notes" value={form.notes ?? ""} onChange={(value) => setField("notes", value)} />
        <button
          type="button"
          onClick={save}
          disabled={saving || !(form.name ?? "").trim()}
          className="w-full bg-[#FF6B35] text-void py-3 text-[13px] font-bold uppercase tracking-wider hover:bg-[#FF6B35]/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving" : "Create day"}
        </button>
      </div>
    </ModalFrame>
  );
}

function AddExerciseModal({
  target,
  onClose,
  onSaved,
}: {
  target: AddExerciseState;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!target) return;
    const nextOrder = target.section
      ? target.section.exercises.length
      : target.day.exercises.length;
    setForm({
      name: "",
      sets_reps: target.section?.sets_reps ?? target.day.sets_reps ?? "",
      rest: "",
      duration: "",
      notes: "",
      instructions: "",
      sort_order: String(nextOrder),
      section_id: target.section?.id ?? "",
      machine_name: "",
      machine_image_url: "",
      demo_image_url: "",
      demo_video_url: "",
    });
  }, [target]);

  if (!target) return null;
  const currentTarget = target;
  const isLegacy = currentTarget.program.source === "legacy_workout_plans";

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const body = isLegacy
        ? {
            kind: "legacy_exercise",
            plan_id: currentTarget.program.id,
            day_index: currentTarget.day.sort_order,
            section_name: currentTarget.section?.muscle_group ?? currentTarget.section?.name ?? null,
            name: form.name.trim(),
            sets_reps: clean(form.sets_reps),
            rest: clean(form.rest),
            duration: clean(form.duration),
            notes: clean(form.notes),
            instructions: clean(form.instructions),
            sort_order: parseOrder(form.sort_order),
            media: {
              machine_name: clean(form.machine_name),
              machine_image_url: clean(form.machine_image_url),
              demo_image_url: clean(form.demo_image_url),
              demo_video_url: clean(form.demo_video_url),
              instructions: clean(form.instructions),
            },
          }
        : {
            kind: "exercise",
            day_id: currentTarget.day.id,
            section_id: currentTarget.section?.id ?? null,
            name: form.name.trim(),
            sets_reps: clean(form.sets_reps),
            rest: clean(form.rest),
            duration: clean(form.duration),
            notes: clean(form.notes),
            instructions: clean(form.instructions),
            sort_order: parseOrder(form.sort_order),
            media: {
              machine_name: clean(form.machine_name),
              machine_image_url: clean(form.machine_image_url),
              demo_image_url: clean(form.demo_image_url),
              demo_video_url: clean(form.demo_video_url),
              instructions: clean(form.instructions),
            },
          };
      const res = await fetch("/api/coach/workout-programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError("فشل الحفظ", json.error ?? "Please try again.");
        return;
      }
      await onSaved();
    } catch {
      toastError("Network error", "Could not create exercise.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalFrame title="إضافة تمرين" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="bg-iron/70 border border-white/[0.06] p-3">
          <p className="text-white/35 text-[10px] font-mono uppercase tracking-[0.14em]">Target</p>
          <p className="text-white text-[13px] mt-1">
            {currentTarget.program.name} · {currentTarget.day.name}
            {currentTarget.section ? ` · ${currentTarget.section.muscle_group ?? currentTarget.section.name}` : ""}
          </p>
        </div>
        {isLegacy && (
          <p className="text-gold text-[12px] border border-gold/20 bg-gold/[0.05] p-3">
            سيتم حفظ هذا التمرين مؤقتاً داخل جدول workout_plans الحالي. بعد تطبيق الجداول المنظمة سيتم الحفظ داخل workout_template_exercises.
          </p>
        )}
        <TextInput label="اسم التمرين" value={form.name ?? ""} onChange={(value) => setField("name", value)} />
        <div className="grid sm:grid-cols-4 gap-3">
          <TextInput label="التكرارات / الجولات" value={form.sets_reps ?? ""} onChange={(value) => setField("sets_reps", value)} />
          <TextInput label="الراحة" value={form.rest ?? ""} onChange={(value) => setField("rest", value)} />
          <TextInput label="المدة" value={form.duration ?? ""} onChange={(value) => setField("duration", value)} />
          <TextInput label="الترتيب" value={form.sort_order ?? ""} onChange={(value) => setField("sort_order", value)} />
        </div>
        <TextArea label="ملاحظات" value={form.notes ?? ""} onChange={(value) => setField("notes", value)} />
        <MediaFields form={form} exerciseName={form.name ?? ""} setField={setField} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving || !(form.name ?? "").trim()}
            className="flex-1 bg-[#FF6B35] text-void py-3 text-[13px] font-bold uppercase tracking-wider hover:bg-[#FF6B35]/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "جار الحفظ" : "حفظ"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 border border-white/[0.08] text-white/60 text-[13px] font-bold hover:text-white hover:border-white/20 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

function MediaFields({
  form,
  exerciseName,
  setField,
}: {
  form: Record<string, string>;
  exerciseName: string;
  setField: (field: string, value: string) => void;
}) {
  const sources = useMediaSources();
  const [query, setQuery] = useState("");
  const [autoAppliedFor, setAutoAppliedFor] = useState("");

  useEffect(() => {
    const name = exerciseName.trim();
    if (!name || sources.length === 0 || autoAppliedFor === name) return;
    const machine = bestMediaMatch(name, sources.filter((source) => source.type === "machine"));
    const demo = bestMediaMatch(name, sources.filter((source) => source.type === "demo"));
    if (!form.machine_image_url && machine) {
      setField("machine_image_url", machine.url);
      setField("machine_name", form.machine_name || machine.name);
    }
    if (!form.demo_image_url && demo) {
      setField("demo_image_url", demo.url);
    }
    if (!form.instructions) {
      setField("instructions", `Use controlled form for ${name}. Keep the target muscle engaged and ask your coach if anything feels painful.`);
    }
    setAutoAppliedFor(name);
  }, [autoAppliedFor, exerciseName, form.demo_image_url, form.instructions, form.machine_image_url, form.machine_name, setField, sources]);

  const filtered = useMemo(() => {
    const q = normalizeForMatch(query);
    const list = q
      ? sources.filter((source) => normalizeForMatch(source.name).includes(q))
      : sources.slice(0, 18);
    return list.slice(0, 30);
  }, [query, sources]);

  function pick(source: MediaSource) {
    if (source.type === "machine") {
      setField("machine_image_url", source.url);
      setField("machine_name", source.name);
    } else {
      setField("demo_image_url", source.url);
    }
  }

  return (
    <div className="pt-3 border-t border-white/[0.06] space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[#FF6B35] text-[11px] font-bold">كيفية استخدام الجهاز / الوسائط</p>
        <span className="text-gold/70 text-[10px]">اقتراح تلقائي قابل للتعديل</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <SelectedMedia label="صورة الجهاز" src={form.machine_image_url} empty="لا يوجد جهاز مرتبط" />
        <SelectedMedia label="صورة الشرح" src={form.demo_image_url} empty="لا توجد صورة شرح" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <TextInput label="اسم الجهاز" value={form.machine_name ?? ""} onChange={(value) => setField("machine_name", value)} />
        <TextInput label="رابط فيديو الشرح" value={form.demo_video_url ?? ""} onChange={(value) => setField("demo_video_url", value)} />
        <TextInput label="مسار صورة الجهاز" value={form.machine_image_url ?? ""} onChange={(value) => setField("machine_image_url", value)} />
        <TextInput label="مسار صورة الشرح" value={form.demo_image_url ?? ""} onChange={(value) => setField("demo_image_url", value)} />
      </div>
      <TextArea label="التعليمات" value={form.instructions ?? ""} onChange={(value) => setField("instructions", value)} />
      <div className="space-y-2">
        <TextInput label="اختر الجهاز / الصورة" value={query} onChange={setQuery} />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
          {filtered.map((source) => (
            <button
              key={`${source.type}-${source.url}`}
              type="button"
              onClick={() => pick(source)}
              className="text-right border border-white/[0.06] bg-white/[0.03] hover:border-gold/30 transition-colors overflow-hidden"
            >
              <ExerciseImage src={source.url} alt={source.name} className="w-full h-24" />
              <div className="p-2">
                <p className="text-white/70 text-[11px] truncate">{source.name}</p>
                <p className="text-gold/60 text-[10px]">{source.type === "machine" ? "جهاز" : "شرح"}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SelectedMedia({ label, src, empty }: { label: string; src?: string; empty: string }) {
  return (
    <div className="border border-white/[0.06] bg-white/[0.025] p-2">
      <p className="text-white/35 text-[10px] font-bold mb-2">{label}</p>
      {src ? (
        <ExerciseImage src={src} alt={label} className="w-full h-32" />
      ) : (
        <div className="h-32 flex items-center justify-center text-white/25 text-[12px] bg-iron border border-white/[0.04]">
          {empty}
        </div>
      )}
    </div>
  );
}

function useMediaSources(): MediaSource[] {
  const [sources, setSources] = useState<MediaSource[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/coach/media-sources")
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success) setSources(json.data ?? []);
      })
      .catch(() => {
        if (active) setSources([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return sources;
}

function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function bestMediaMatch(exerciseName: string, sources: MediaSource[]): MediaSource | null {
  const exerciseTokens = new Set(normalizeForMatch(exerciseName).split(" ").filter(Boolean));
  let best: { source: MediaSource; score: number } | null = null;

  for (const source of sources) {
    const sourceTokens = normalizeForMatch(source.name).split(" ").filter(Boolean);
    const overlap = sourceTokens.filter((token) => exerciseTokens.has(token)).length;
    const exactBonus = normalizeForMatch(source.name) === normalizeForMatch(exerciseName) ? 4 : 0;
    const score = overlap + exactBonus;
    if (score > (best?.score ?? 0)) best = { source, score };
  }

  return best && best.score >= 1 ? best.source : null;
}

function AssignTemplateModal({
  program,
  onClose,
  onAssigned,
}: {
  program: WorkoutProgramTemplate | null;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { error: toastError } = useToast();
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!program) return;
    setSearch("");
    setSelectedPlayerId("");
    setLoading(true);
    fetch("/api/coach/players")
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error ?? "Failed to load players");
        setPlayers(json.data ?? []);
      })
      .catch((err) => toastError("Players failed", err instanceof Error ? err.message : "Please try again."))
      .finally(() => setLoading(false));
  }, [program, toastError]);

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter((player) =>
      player.full_name.toLowerCase().includes(q)
      || (player.phone?.toLowerCase().includes(q) ?? false),
    );
  }, [players, search]);

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) ?? null;

  if (!program) return null;

  async function assign() {
    if (!program || !selectedPlayerId) return;
    setAssigning(true);
    try {
      const isLegacyPlan = program.source === "legacy_workout_plans";
      const res = await fetch(isLegacyPlan ? "/api/send-plan" : "/api/coach/workout-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isLegacyPlan
          ? { member_id: selectedPlayerId, plan_id: program.id, plan_type: "workout" }
          : { member_id: selectedPlayerId, template_id: program.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError("Assign failed", json.error ?? "Please try again.");
        return;
      }
      onAssigned();
    } catch {
      toastError("Network error", "Could not assign workout program.");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <ModalFrame title="تعيين برنامج للاعب" onClose={onClose} wide>
      <div className="grid md:grid-cols-[1fr_280px] gap-4">
        <section className="space-y-3">
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث عن لاعب بالاسم أو الهاتف"
              className="w-full h-11 pr-10 pl-3 bg-iron border border-steel text-white text-[13px] placeholder:text-white/25 focus:border-[#FF6B35]/50 focus:outline-none"
            />
          </div>
          <div className="max-h-[360px] overflow-y-auto space-y-2">
            {loading ? (
              <p className="text-white/35 text-[13px] text-center py-10">Loading players...</p>
            ) : filteredPlayers.length === 0 ? (
              <p className="text-white/35 text-[13px] text-center py-10">No players found.</p>
            ) : (
              filteredPlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => setSelectedPlayerId(player.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 text-right border transition-colors",
                    selectedPlayerId === player.id
                      ? "bg-[#FF6B35]/10 border-[#FF6B35]/35"
                      : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]",
                  )}
                >
                  <div className="w-9 h-9 bg-[#FF6B35]/10 text-[#FF6B35] flex items-center justify-center flex-shrink-0">
                    <User size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[13px] font-semibold truncate">{player.full_name}</p>
                    <p className="text-white/35 text-[11px] truncate">
                      {player.phone ?? "No phone"}
                      {player.current_assignment?.template?.name ? ` · ${player.current_assignment.template.name}` : ""}
                    </p>
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
          <div className="space-y-2">
            {program.days.slice(0, 5).map((day) => (
              <div key={day.id} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="text-white/70 truncate">{day.name}</span>
                <span className="text-gold">{day.exercises.length + day.sections.flatMap((section) => section.exercises).length}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.06] pt-4">
            <p className="text-white/35 text-[11px]">Selected player</p>
            <p className="text-white text-[13px] font-semibold mt-1">{selectedPlayer?.full_name ?? "لم يتم اختيار لاعب"}</p>
          </div>
          <button
            type="button"
            onClick={assign}
            disabled={!selectedPlayerId || assigning}
            className="w-full bg-[#FF6B35] text-void py-3 text-[13px] font-bold uppercase tracking-wider hover:bg-[#FF6B35]/90 disabled:opacity-50 transition-colors"
          >
            {assigning ? "Assigning" : "Assign program"}
          </button>
        </aside>
      </div>
    </ModalFrame>
  );
}

function MediaPreviewModal({
  exercise,
  onClose,
}: {
  exercise: WorkoutTemplateExercise | null;
  onClose: () => void;
}) {
  if (!exercise) return null;
  const media = exercise.media;
  return (
    <ModalFrame title="كيفية استخدام الجهاز" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <ExerciseImage src={media?.machine_image_url} alt={`${exercise.name} machine`} className="w-full h-40" />
          <ExerciseImage src={media?.demo_image_url} alt={`${exercise.name} demo`} className="w-full h-40" />
        </div>
        {media?.demo_video_url && (
          <a href={media.demo_video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-gold text-[13px] font-semibold">
            <PlayCircle size={15} />
            Open demo video
          </a>
        )}
        <div>
          <h3 className="text-white text-[19px] font-semibold">{exercise.name}</h3>
          {media?.machine_name && <p className="text-gold/70 text-[13px] mt-1">{media.machine_name}</p>}
          <p className="text-white/45 text-[14px] mt-3 leading-relaxed">
            {media?.instructions ?? exercise.notes ?? "Move with control, keep the target muscle engaged, and ask your coach if anything feels painful."}
          </p>
        </div>
      </div>
    </ModalFrame>
  );
}

function ModalFrame({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={cn("bg-charcoal border border-white/[0.08] w-full max-h-[86vh] overflow-y-auto", wide ? "max-w-4xl" : "max-w-xl")}
        onClick={(event) => event.stopPropagation()}
        dir="rtl"
      >
        <div className="sticky top-0 z-10 bg-charcoal border-b border-white/[0.06] p-5 flex items-start justify-between gap-4">
          <h2 className="text-white text-[18px] font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-white/35 text-[11px] font-bold uppercase tracking-[0.12em]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full h-10 bg-iron border border-steel text-white text-[13px] px-3 focus:border-[#FF6B35]/50 focus:outline-none"
      />
    </label>
  );
}

function SelectInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-white/35 text-[11px] font-bold uppercase tracking-[0.12em]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full h-10 bg-iron border border-steel text-white text-[13px] px-3 focus:border-[#FF6B35]/50 focus:outline-none"
      >
        <option value="training">Training</option>
        <option value="rest">Rest</option>
        <option value="flexible">Flexible</option>
      </select>
    </label>
  );
}

function CheckboxInput({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 border border-white/[0.06] bg-white/[0.025] p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#FF6B35]"
      />
      <span className="text-white/65 text-[13px] font-semibold">{label}</span>
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-white/35 text-[11px] font-bold uppercase tracking-[0.12em]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-1 w-full bg-iron border border-steel text-white text-[13px] p-3 focus:border-[#FF6B35]/50 focus:outline-none"
      />
    </label>
  );
}

function IconButton({
  label,
  onClick,
  children,
  accent,
  danger,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  accent?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "w-9 h-9 flex items-center justify-center border transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        accent
          ? "bg-[#FF6B35] border-[#FF6B35] text-void hover:bg-[#FF6B35]/90"
          : danger
            ? "border-red-500/20 text-red-300/70 hover:text-red-200 hover:border-red-400/40"
          : "border-white/[0.08] text-white/50 hover:text-white hover:border-white/20",
      )}
    >
      {children}
    </button>
  );
}

function InfoStrip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.055] p-3 text-[12px]">
      <span className="text-gold font-bold">{label}: </span>
      <span className="text-white/55">{value}</span>
    </div>
  );
}

function ProgramSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-28 border border-white/[0.06] bg-white/[0.03] animate-pulse" />
      ))}
    </div>
  );
}

function toggleSetValue(source: Set<string>, value: string): Set<string> {
  const next = new Set(source);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function countProgramExercises(program: WorkoutProgramTemplate): number {
  return program.days.reduce(
    (total, day) => total + day.exercises.length + day.sections.reduce((sum, section) => sum + section.exercises.length, 0),
    0,
  );
}

function clean(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function canonicalDayType(value: string | undefined): "training" | "rest" | "flexible" {
  if (value === "rest" || value === "rest_day") return "rest";
  if (value === "flexible" || value === "flexible_day") return "flexible";
  return "training";
}

function buildPatchPayload(editor: NonNullable<EditorState>, form: Record<string, string>) {
  if (editor.type === "program") {
    return {
      kind: "program",
      id: editor.program.id,
      name: form.name.trim(),
      category: form.category.trim(),
      gender_focus: clean(form.gender_focus),
      description: clean(form.description),
      is_active: form.is_active !== "false",
    };
  }
  if (editor.type === "day") {
    return {
      kind: "day",
      id: editor.day.id,
      name: form.name.trim(),
      day_number: parseNullableNumber(form.day_number),
      sets_reps: clean(form.sets_reps),
      day_type: canonicalDayType(form.day_type),
      notes: clean(form.notes),
      sort_order: parseOrder(form.sort_order),
    };
  }
  return {
    kind: "exercise",
    id: editor.exercise.id,
    name: form.name.trim(),
    sets_reps: clean(form.sets_reps),
    rest: clean(form.rest),
    duration: clean(form.duration),
    notes: clean(form.notes),
    sort_order: parseOrder(form.sort_order),
    media: {
      machine_name: clean(form.machine_name),
      machine_image_url: clean(form.machine_image_url),
      demo_image_url: clean(form.demo_image_url),
      demo_video_url: clean(form.demo_video_url),
      instructions: clean(form.instructions),
    },
  };
}

function parseOrder(value: string | undefined): number | undefined {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseNullableNumber(value: string | undefined): number | null {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
