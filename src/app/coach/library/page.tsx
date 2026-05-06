"use client";

// ═══════════════════════════════════════════════════════════════
// Coach Library — manage training systems, days, muscle groups,
// and the exercise library that powers the plan builder.
//
// Every change writes through to Supabase immediately (RLS already
// enforces who can write — coach/head_coach/manager). Deactivate is
// preferred over hard delete; rows stay in the DB so existing plans
// keep displaying their original data.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, Pencil, Save, X, Trash2,
  Eye, EyeOff, Search, Layers, Calendar, Activity, Dumbbell,
} from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { ExerciseImage } from "@/components/ui/ExerciseImage";
import { cn } from "@/lib/utils";
import type { TrainingSystem, TrainingSystemDay, MuscleGroup, Exercise } from "@/types";

type TabKey = "systems" | "days" | "muscles" | "exercises";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "systems",   label: "Training Systems", icon: Layers   },
  { key: "days",      label: "Days",             icon: Calendar },
  { key: "muscles",   label: "Muscle Groups",    icon: Activity },
  { key: "exercises", label: "Exercises",        icon: Dumbbell },
];

export default function CoachLibraryPage() {
  const [tab, setTab] = useState<TabKey>("systems");

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] tracking-wider text-white">Training Library</h1>
          <p className="text-white/40 text-[13px] mt-1">
            Manage systems, days, muscle groups, and exercises used by the plan builder.
          </p>
        </div>
        <Link
          href="/coach/plans"
          className="flex items-center gap-1.5 text-white/40 hover:text-white text-[12px] font-mono uppercase tracking-wider transition-colors flex-shrink-0"
        >
          <ArrowLeft size={14} />
          Plans
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.08] overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                active
                  ? "text-[#FF6B35] border-b-[#FF6B35]"
                  : "text-white/40 border-b-transparent hover:text-white/70",
              )}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "systems"   && <SystemsPanel />}
      {tab === "days"      && <DaysPanel />}
      {tab === "muscles"   && <MuscleGroupsPanel />}
      {tab === "exercises" && <ExercisesPanel />}
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────

function useSaveState() {
  const [saving, setSaving] = useState<string | null>(null);
  return { saving, setSaving };
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={cn(
      "text-[10px] font-mono uppercase tracking-wider px-2 py-0.5",
      active ? "bg-green-500/10 text-green-400" : "bg-white/[0.04] text-white/30",
    )}>
      {active ? "Active" : "Hidden"}
    </span>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="text-center py-16 border border-dashed border-white/[0.08]">
      <Icon size={32} className="mx-auto text-white/15 mb-3" />
      <p className="text-white/40 text-[13px]">{message}</p>
    </div>
  );
}

function LoadingState() {
  return <div className="text-white/30 text-[13px] text-center py-8">Loading…</div>;
}

// ═══════════════════════════════════════════════════════════════
// 1. TRAINING SYSTEMS PANEL
// ═══════════════════════════════════════════════════════════════

function SystemsPanel() {
  const [rows, setRows]       = useState<TrainingSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { saving, setSaving } = useSaveState();
  const { success, error: toastError } = useToast();

  const load = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from("training_systems")
      .select("*")
      .order("sort_order").order("name");
    if (error) toastError("Failed to load systems", error.message);
    else setRows(data ?? []);
    setLoading(false);
  }, [toastError]);

  useEffect(() => { load(); }, [load]);

  async function saveRow(row: Partial<TrainingSystem> & { id?: string }) {
    setSaving(row.id ?? "new");
    const supabase = createBrowserSupabase();
    const payload = {
      name:        row.name?.trim() ?? "",
      description: row.description ?? null,
      is_active:   row.is_active ?? true,
      sort_order:  row.sort_order ?? 0,
    };
    if (!payload.name) {
      toastError("Name required"); setSaving(null); return;
    }
    const { error } = row.id
      ? await supabase.from("training_systems").update(payload).eq("id", row.id)
      : await supabase.from("training_systems").insert(payload);
    setSaving(null);
    if (error) {
      toastError("Save failed", error.message);
      return;
    }
    success(row.id ? "System updated" : "System added");
    setEditing(null); setCreating(false);
    load();
  }

  async function toggleActive(row: TrainingSystem) {
    if (!confirm(`${row.is_active ? "Deactivate" : "Activate"} "${row.name}"?`)) return;
    setSaving(row.id);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("training_systems")
      .update({ is_active: !row.is_active }).eq("id", row.id);
    setSaving(null);
    if (error) toastError("Update failed", error.message);
    else { success(row.is_active ? "Deactivated" : "Activated"); load(); }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-white/40 text-[12px]">{rows.length} system{rows.length === 1 ? "" : "s"}</p>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 bg-[#FF6B35] text-void px-3 py-2 text-[12px] font-bold uppercase tracking-wider hover:bg-[#FF6B35]/90 transition-colors"
          >
            <Plus size={14} /> Add System
          </button>
        )}
      </div>

      {creating && (
        <SystemRowForm
          initial={{ is_active: true, sort_order: rows.length * 10 }}
          saving={saving === "new"}
          onCancel={() => setCreating(false)}
          onSave={saveRow}
        />
      )}

      {loading && <LoadingState />}
      {!loading && rows.length === 0 && !creating && (
        <EmptyState icon={Layers} message="No training systems yet. Click 'Add System' to start." />
      )}

      <div className="space-y-2">
        {rows.map((r) => editing === r.id ? (
          <SystemRowForm
            key={r.id}
            initial={r}
            saving={saving === r.id}
            onCancel={() => setEditing(null)}
            onSave={(v) => saveRow({ ...v, id: r.id })}
          />
        ) : (
          <div
            key={r.id}
            className={cn(
              "flex items-center gap-3 p-4 bg-white/[0.04] border border-white/[0.06]",
              !r.is_active && "opacity-50",
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white text-[14px] font-medium truncate">{r.name}</p>
                <StatusPill active={r.is_active} />
              </div>
              {r.description && (
                <p className="text-white/40 text-[12px] mt-0.5 truncate">{r.description}</p>
              )}
              <p className="text-white/25 text-[10px] font-mono mt-1">sort: {r.sort_order}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <IconBtn label="Edit" onClick={() => setEditing(r.id)}><Pencil size={14} /></IconBtn>
              <IconBtn
                label={r.is_active ? "Deactivate" : "Activate"}
                onClick={() => toggleActive(r)}
                disabled={saving === r.id}
              >
                {r.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
              </IconBtn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemRowForm({
  initial, saving, onCancel, onSave,
}: {
  initial:  Partial<TrainingSystem>;
  saving:   boolean;
  onCancel: () => void;
  onSave:   (v: Partial<TrainingSystem>) => void;
}) {
  const [name,        setName]        = useState(initial.name ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [isActive,    setIsActive]    = useState(initial.is_active ?? true);
  const [sortOrder,   setSortOrder]   = useState(initial.sort_order ?? 0);

  return (
    <div className="p-4 bg-white/[0.06] border border-[#FF6B35]/30 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
        <input
          autoFocus
          placeholder="System name (e.g. Classic PPL)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <input
          type="number"
          placeholder="Sort"
          value={sortOrder}
          onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
          className={cn(inputClass, "font-mono text-center")}
        />
      </div>
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className={cn(inputClass, "resize-y min-h-[60px]")}
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-white/60 text-[12px] cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
        <FormActions saving={saving} onCancel={onCancel} onSave={() => onSave({ name, description, is_active: isActive, sort_order: sortOrder })} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 2. DAYS PANEL  (per-system)
// ═══════════════════════════════════════════════════════════════

function DaysPanel() {
  const [systems,    setSystems]    = useState<TrainingSystem[]>([]);
  const [systemId,   setSystemId]   = useState<string>("");
  const [days,       setDays]       = useState<TrainingSystemDay[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [editing,    setEditing]    = useState<string | null>(null);
  const [creating,   setCreating]   = useState(false);
  const { saving, setSaving } = useSaveState();
  const { success, error: toastError } = useToast();

  // Load systems on mount
  useEffect(() => {
    (async () => {
      const supabase = createBrowserSupabase();
      const { data, error } = await supabase
        .from("training_systems")
        .select("*")
        .eq("is_active", true)
        .order("sort_order").order("name");
      if (error) toastError("Failed to load systems", error.message);
      else {
        setSystems(data ?? []);
        if (data && data.length > 0 && !systemId) setSystemId(data[0].id);
      }
      setLoading(false);
    })();
  }, [toastError, systemId]);

  // Load days when system changes
  const loadDays = useCallback(async () => {
    if (!systemId) { setDays([]); return; }
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from("training_system_days")
      .select("*")
      .eq("training_system_id", systemId)
      .order("sort_order").order("day_number");
    if (error) toastError("Failed to load days", error.message);
    else setDays(data ?? []);
  }, [systemId, toastError]);

  useEffect(() => { loadDays(); }, [loadDays]);

  async function saveDay(row: Partial<TrainingSystemDay> & { id?: string }) {
    setSaving(row.id ?? "new");
    const supabase = createBrowserSupabase();
    const payload = {
      training_system_id: systemId,
      title:      row.title?.trim() ?? "",
      focus:      row.focus ?? null,
      day_number: row.day_number ?? null,
      sort_order: row.sort_order ?? 0,
    };
    if (!payload.title) { toastError("Title required"); setSaving(null); return; }
    const { error } = row.id
      ? await supabase.from("training_system_days").update(payload).eq("id", row.id)
      : await supabase.from("training_system_days").insert(payload);
    setSaving(null);
    if (error) toastError("Save failed", error.message);
    else { success(row.id ? "Day updated" : "Day added"); setEditing(null); setCreating(false); loadDays(); }
  }

  async function deleteDay(d: TrainingSystemDay) {
    if (!confirm(`Remove day "${d.title}"? This cannot be undone.`)) return;
    setSaving(d.id);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("training_system_days").delete().eq("id", d.id);
    setSaving(null);
    if (error) toastError("Delete failed", error.message);
    else { success("Day removed"); loadDays(); }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={systemId}
          onChange={(e) => setSystemId(e.target.value)}
          className={cn(inputClass, "sm:max-w-xs")}
        >
          {systems.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {systemId && !creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center justify-center gap-1.5 bg-[#FF6B35] text-void px-3 py-2 text-[12px] font-bold uppercase tracking-wider hover:bg-[#FF6B35]/90 transition-colors sm:ml-auto"
          >
            <Plus size={14} /> Add Day
          </button>
        )}
      </div>

      {creating && (
        <DayRowForm
          initial={{ sort_order: days.length * 10, day_number: days.length + 1 }}
          saving={saving === "new"}
          onCancel={() => setCreating(false)}
          onSave={saveDay}
        />
      )}

      {loading && <LoadingState />}
      {!loading && systemId && days.length === 0 && !creating && (
        <EmptyState icon={Calendar} message="No days for this system yet." />
      )}

      <div className="space-y-2">
        {days.map((d) => editing === d.id ? (
          <DayRowForm
            key={d.id}
            initial={d}
            saving={saving === d.id}
            onCancel={() => setEditing(null)}
            onSave={(v) => saveDay({ ...v, id: d.id })}
          />
        ) : (
          <div key={d.id} className="flex items-center gap-3 p-4 bg-white/[0.04] border border-white/[0.06]">
            <span className="font-mono text-[10px] text-[#FF6B35] bg-[#FF6B35]/10 px-2 py-0.5 flex-shrink-0">
              D{d.day_number ?? "—"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[14px] font-medium truncate">{d.title}</p>
              {d.focus && <p className="text-white/40 text-[12px] truncate">{d.focus}</p>}
              <p className="text-white/25 text-[10px] font-mono mt-1">sort: {d.sort_order}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <IconBtn label="Edit" onClick={() => setEditing(d.id)}><Pencil size={14} /></IconBtn>
              <IconBtn label="Delete" onClick={() => deleteDay(d)} disabled={saving === d.id} danger><Trash2 size={14} /></IconBtn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayRowForm({
  initial, saving, onCancel, onSave,
}: {
  initial:  Partial<TrainingSystemDay>;
  saving:   boolean;
  onCancel: () => void;
  onSave:   (v: Partial<TrainingSystemDay>) => void;
}) {
  const [title,     setTitle]     = useState(initial.title ?? "");
  const [focus,     setFocus]     = useState(initial.focus ?? "");
  const [dayNumber, setDayNumber] = useState<number | "">(initial.day_number ?? "");
  const [sortOrder, setSortOrder] = useState(initial.sort_order ?? 0);

  return (
    <div className="p-4 bg-white/[0.06] border border-[#FF6B35]/30 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_100px] gap-3">
        <input
          autoFocus
          placeholder="Title (e.g. Push)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
        <input
          type="number"
          placeholder="Day #"
          value={dayNumber}
          onChange={(e) => setDayNumber(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
          className={cn(inputClass, "font-mono text-center")}
        />
        <input
          type="number"
          placeholder="Sort"
          value={sortOrder}
          onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
          className={cn(inputClass, "font-mono text-center")}
        />
      </div>
      <input
        placeholder="Focus (optional)"
        value={focus}
        onChange={(e) => setFocus(e.target.value)}
        className={inputClass}
      />
      <div className="flex justify-end">
        <FormActions
          saving={saving}
          onCancel={onCancel}
          onSave={() => onSave({
            title,
            focus:      focus || null,
            day_number: dayNumber === "" ? null : Number(dayNumber),
            sort_order: sortOrder,
          })}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 3. MUSCLE GROUPS PANEL
// ═══════════════════════════════════════════════════════════════

function MuscleGroupsPanel() {
  const [rows, setRows]         = useState<MuscleGroup[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { saving, setSaving } = useSaveState();
  const { success, error: toastError } = useToast();

  const load = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from("muscle_groups").select("*").order("sort_order").order("name");
    if (error) toastError("Failed to load", error.message);
    else setRows(data ?? []);
    setLoading(false);
  }, [toastError]);

  useEffect(() => { load(); }, [load]);

  async function saveRow(row: Partial<MuscleGroup> & { id?: string }) {
    setSaving(row.id ?? "new");
    const supabase = createBrowserSupabase();
    const payload = {
      name:       row.name?.trim() ?? "",
      is_active:  row.is_active ?? true,
      sort_order: row.sort_order ?? 0,
    };
    if (!payload.name) { toastError("Name required"); setSaving(null); return; }
    const { error } = row.id
      ? await supabase.from("muscle_groups").update(payload).eq("id", row.id)
      : await supabase.from("muscle_groups").insert(payload);
    setSaving(null);
    if (error) toastError("Save failed", error.message);
    else { success(row.id ? "Updated" : "Added"); setEditing(null); setCreating(false); load(); }
  }

  async function toggleActive(row: MuscleGroup) {
    if (!confirm(`${row.is_active ? "Deactivate" : "Activate"} "${row.name}"?`)) return;
    setSaving(row.id);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("muscle_groups")
      .update({ is_active: !row.is_active }).eq("id", row.id);
    setSaving(null);
    if (error) toastError("Update failed", error.message);
    else { success(row.is_active ? "Deactivated" : "Activated"); load(); }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-white/40 text-[12px]">{rows.length} group{rows.length === 1 ? "" : "s"}</p>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 bg-[#FF6B35] text-void px-3 py-2 text-[12px] font-bold uppercase tracking-wider hover:bg-[#FF6B35]/90 transition-colors"
          >
            <Plus size={14} /> Add Group
          </button>
        )}
      </div>

      {creating && (
        <SimpleNameForm
          initial={{ is_active: true, sort_order: rows.length * 10 }}
          saving={saving === "new"}
          onCancel={() => setCreating(false)}
          onSave={saveRow}
        />
      )}

      {loading && <LoadingState />}
      {!loading && rows.length === 0 && !creating && (
        <EmptyState icon={Activity} message="No muscle groups yet." />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map((r) => editing === r.id ? (
          <SimpleNameForm
            key={r.id}
            initial={r}
            saving={saving === r.id}
            onCancel={() => setEditing(null)}
            onSave={(v) => saveRow({ ...v, id: r.id })}
          />
        ) : (
          <div
            key={r.id}
            className={cn(
              "flex items-center gap-3 p-3 bg-white/[0.04] border border-white/[0.06]",
              !r.is_active && "opacity-50",
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white text-[14px] font-medium truncate">{r.name}</p>
                <StatusPill active={r.is_active} />
              </div>
              <p className="text-white/25 text-[10px] font-mono mt-1">sort: {r.sort_order}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <IconBtn label="Edit" onClick={() => setEditing(r.id)}><Pencil size={14} /></IconBtn>
              <IconBtn label={r.is_active ? "Deactivate" : "Activate"} onClick={() => toggleActive(r)} disabled={saving === r.id}>
                {r.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
              </IconBtn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleNameForm({
  initial, saving, onCancel, onSave,
}: {
  initial:  Partial<MuscleGroup>;
  saving:   boolean;
  onCancel: () => void;
  onSave:   (v: Partial<MuscleGroup>) => void;
}) {
  const [name,      setName]      = useState(initial.name ?? "");
  const [isActive,  setIsActive]  = useState(initial.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(initial.sort_order ?? 0);

  return (
    <div className="p-3 bg-white/[0.06] border border-[#FF6B35]/30 space-y-2">
      <div className="grid grid-cols-[1fr_80px] gap-2">
        <input
          autoFocus
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <input
          type="number"
          placeholder="Sort"
          value={sortOrder}
          onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
          className={cn(inputClass, "font-mono text-center")}
        />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-white/60 text-[11px] cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
        <FormActions
          saving={saving}
          onCancel={onCancel}
          onSave={() => onSave({ name, is_active: isActive, sort_order: sortOrder })}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 4. EXERCISES PANEL
// ═══════════════════════════════════════════════════════════════

function ExercisesPanel() {
  const [rows, setRows]             = useState<Exercise[]>([]);
  const [groups, setGroups]         = useState<MuscleGroup[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("");
  const [editing, setEditing]       = useState<string | null>(null);
  const [creating, setCreating]     = useState(false);
  const { saving, setSaving }       = useSaveState();
  const { success, error: toastError } = useToast();

  const load = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const [exRes, mgRes] = await Promise.all([
      supabase.from("exercises").select("*").order("sort_order").order("name"),
      supabase.from("muscle_groups").select("*").eq("is_active", true).order("sort_order").order("name"),
    ]);
    if (exRes.error) toastError("Failed to load exercises", exRes.error.message);
    else setRows(exRes.data ?? []);
    if (mgRes.error) toastError("Failed to load groups", mgRes.error.message);
    else setGroups(mgRes.data ?? []);
    setLoading(false);
  }, [toastError]);

  useEffect(() => { load(); }, [load]);

  async function saveRow(row: Partial<Exercise> & { id?: string }) {
    setSaving(row.id ?? "new");
    const supabase = createBrowserSupabase();
    const payload = {
      name:              row.name?.trim() ?? "",
      muscle_group_id:   row.muscle_group_id ?? null,
      equipment:         row.equipment ?? null,
      image_url:         row.image_url ?? null,
      machine_image_url: row.machine_image_url ?? null,
      demo_url:          row.demo_url ?? null,
      file_name:         row.file_name ?? null,
      storage_path:      row.storage_path ?? null,
      instructions:      row.instructions ?? null,
      is_active:         row.is_active ?? true,
      sort_order:        row.sort_order ?? 0,
    };
    if (!payload.name) { toastError("Name required"); setSaving(null); return; }
    const { error } = row.id
      ? await supabase.from("exercises").update(payload).eq("id", row.id)
      : await supabase.from("exercises").insert(payload);
    setSaving(null);
    if (error) toastError("Save failed", error.message);
    else { success(row.id ? "Updated" : "Added"); setEditing(null); setCreating(false); load(); }
  }

  async function toggleActive(row: Exercise) {
    if (!confirm(`${row.is_active ? "Deactivate" : "Activate"} "${row.name}"?`)) return;
    setSaving(row.id);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("exercises")
      .update({ is_active: !row.is_active }).eq("id", row.id);
    setSaving(null);
    if (error) toastError("Update failed", error.message);
    else { success(row.is_active ? "Deactivated" : "Activated"); load(); }
  }

  const groupNameById = (id: string | null) => groups.find((g) => g.id === id)?.name ?? "—";

  const filtered = rows.filter((r) => {
    if (filterGroup && r.muscle_group_id !== filterGroup) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q)
        || (r.equipment?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or equipment…"
            className={cn(inputClass, "pl-9")}
          />
        </div>
        <select
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          className={cn(inputClass, "sm:max-w-[200px]")}
        >
          <option value="">All groups</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center justify-center gap-1.5 bg-[#FF6B35] text-void px-3 py-2 text-[12px] font-bold uppercase tracking-wider hover:bg-[#FF6B35]/90 transition-colors"
          >
            <Plus size={14} /> Add Exercise
          </button>
        )}
      </div>

      {creating && (
        <ExerciseForm
          initial={{ is_active: true, sort_order: rows.length * 10 }}
          groups={groups}
          saving={saving === "new"}
          onCancel={() => setCreating(false)}
          onSave={saveRow}
        />
      )}

      {loading && <LoadingState />}
      {!loading && filtered.length === 0 && !creating && (
        <EmptyState icon={Dumbbell} message={search || filterGroup ? "No exercises match." : "No exercises yet."} />
      )}

      <div className="space-y-2">
        {filtered.map((ex) => editing === ex.id ? (
          <ExerciseForm
            key={ex.id}
            initial={ex}
            groups={groups}
            saving={saving === ex.id}
            onCancel={() => setEditing(null)}
            onSave={(v) => saveRow({ ...v, id: ex.id })}
          />
        ) : (
          <div
            key={ex.id}
            className={cn(
              "flex items-start gap-3 p-3 bg-white/[0.04] border border-white/[0.06]",
              !ex.is_active && "opacity-50",
            )}
          >
            <ExerciseImage src={ex.image_url} alt={ex.name} className="w-14 h-14 flex-shrink-0" iconSize={20} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white text-[14px] font-medium truncate">{ex.name}</p>
                <StatusPill active={ex.is_active} />
              </div>
              <p className="text-white/40 text-[12px] mt-0.5">
                {groupNameById(ex.muscle_group_id)}
                {ex.equipment ? ` · ${ex.equipment}` : ""}
              </p>
              {ex.file_name && (
                <p className="text-white/25 text-[10px] font-mono mt-1 truncate">slug: {ex.file_name}</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <IconBtn label="Edit" onClick={() => setEditing(ex.id)}><Pencil size={14} /></IconBtn>
              <IconBtn label={ex.is_active ? "Deactivate" : "Activate"} onClick={() => toggleActive(ex)} disabled={saving === ex.id}>
                {ex.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
              </IconBtn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExerciseForm({
  initial, groups, saving, onCancel, onSave,
}: {
  initial:  Partial<Exercise>;
  groups:   MuscleGroup[];
  saving:   boolean;
  onCancel: () => void;
  onSave:   (v: Partial<Exercise>) => void;
}) {
  const [name,           setName]           = useState(initial.name ?? "");
  const [muscleGroupId,  setMuscleGroupId]  = useState<string | null>(initial.muscle_group_id ?? null);
  const [equipment,      setEquipment]      = useState(initial.equipment ?? "");
  const [imageUrl,       setImageUrl]       = useState(initial.image_url ?? "");
  const [machineUrl,     setMachineUrl]     = useState(initial.machine_image_url ?? "");
  const [demoUrl,        setDemoUrl]        = useState(initial.demo_url ?? "");
  const [fileName,       setFileName]       = useState(initial.file_name ?? "");
  const [storagePath,    setStoragePath]    = useState(initial.storage_path ?? "");
  const [instructions,   setInstructions]   = useState(initial.instructions ?? "");
  const [isActive,       setIsActive]       = useState(initial.is_active ?? true);
  const [sortOrder,      setSortOrder]      = useState(initial.sort_order ?? 0);

  return (
    <div className="p-4 bg-white/[0.06] border border-[#FF6B35]/30 space-y-3">
      {/* Name + group + equipment */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_140px] gap-3">
        <input
          autoFocus
          placeholder="Exercise name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <select
          value={muscleGroupId ?? ""}
          onChange={(e) => setMuscleGroupId(e.target.value || null)}
          className={inputClass}
        >
          <option value="">No group</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <input
          placeholder="Equipment"
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Image previews + URL inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ImageField label="OX comic / brand" url={imageUrl} setUrl={setImageUrl} />
        <ImageField label="Machine photo"     url={machineUrl} setUrl={setMachineUrl} />
        <ImageField label="Demo / animation"  url={demoUrl}    setUrl={setDemoUrl} />
      </div>

      {/* File name + storage path + sort order */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_100px] gap-3">
        <input
          placeholder="file_name (slug, e.g. chest-press)"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          className={cn(inputClass, "font-mono text-[12px]")}
        />
        <input
          placeholder="storage_path (optional)"
          value={storagePath}
          onChange={(e) => setStoragePath(e.target.value)}
          className={cn(inputClass, "font-mono text-[12px]")}
        />
        <input
          type="number"
          placeholder="Sort"
          value={sortOrder}
          onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
          className={cn(inputClass, "font-mono text-center")}
        />
      </div>

      <textarea
        placeholder="Instructions (optional)"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        rows={2}
        className={cn(inputClass, "resize-y min-h-[60px]")}
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-white/60 text-[12px] cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
        <FormActions
          saving={saving}
          onCancel={onCancel}
          onSave={() => onSave({
            name,
            muscle_group_id:   muscleGroupId,
            equipment:         equipment || null,
            image_url:         imageUrl || null,
            machine_image_url: machineUrl || null,
            demo_url:          demoUrl || null,
            file_name:         fileName || null,
            storage_path:      storagePath || null,
            instructions:      instructions || null,
            is_active:         isActive,
            sort_order:        sortOrder,
          })}
        />
      </div>
    </div>
  );
}

function ImageField({ label, url, setUrl }: { label: string; url: string; setUrl: (v: string) => void }) {
  return (
    <div>
      <label className="text-white/40 text-[10px] font-mono uppercase tracking-wider block mb-1">{label}</label>
      <div className="flex gap-2">
        <ExerciseImage src={url} alt={label} className="w-12 h-12 flex-shrink-0" iconSize={16} />
        <input
          placeholder="/exercises/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className={cn(inputClass, "font-mono text-[11px]")}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARED INPUT STYLES + UI BITS
// ═══════════════════════════════════════════════════════════════

const inputClass =
  "w-full h-10 px-3 bg-iron border border-steel text-white text-[13px] placeholder:text-white/25 focus:border-[#FF6B35]/50 focus:outline-none transition-colors";

function FormActions({
  saving, onCancel, onSave,
}: {
  saving:  boolean;
  onCancel: () => void;
  onSave:   () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="px-3 py-1.5 text-white/60 text-[12px] hover:text-white transition-colors disabled:opacity-50"
      >
        <X size={14} className="inline mr-1" /> Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-1.5 bg-[#FF6B35] text-void px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider hover:bg-[#FF6B35]/90 disabled:opacity-50 transition-colors"
      >
        <Save size={12} /> {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

function IconBtn({
  children, onClick, disabled, label, danger,
}: {
  children: React.ReactNode;
  onClick:  () => void;
  disabled?: boolean;
  label:    string;
  danger?:  boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "w-8 h-8 flex items-center justify-center border border-white/[0.08] transition-colors disabled:opacity-30",
        danger ? "text-white/50 hover:text-danger hover:border-danger/40" : "text-white/50 hover:text-white hover:border-white/20",
      )}
    >
      {children}
    </button>
  );
}
