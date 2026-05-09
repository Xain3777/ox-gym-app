"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { cn, daysUntil } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import type { WorkoutProgramTemplate, WorkoutTemplateExercise } from "@/lib/workout-programs";
import {
  AlertTriangle,
  ChevronDown,
  Dumbbell,
  HeartPulse,
  Phone,
  Search,
  Send,
  User,
  X,
} from "lucide-react";

type CoachPlayer = {
  id: string;
  auth_id?: string | null;
  phone_normalized?: string | null;
  full_name: string;
  phone: string | null;
  status: string;
  height_cm: number | null;
  weight_kg: number | null;
  fitness_goal: string | null;
  training_level: string | null;
  illnesses: string[] | null;
  injuries: string[] | null;
  medical_notes: string | null;
  limitations: string | null;
  onboarding_complete: boolean;
  app_registered_at: string | null;
  goals: string | null;
  eligible: boolean;
  has_dashboard_subscription: boolean;
  has_app_profile: boolean;
  has_app_registration: boolean;
  safe_phone_link: boolean;
  duplicate_phone: boolean;
  subscription: {
    plan_type: string;
    start_date: string;
    end_date: string;
    status: string;
  } | null;
  current_assignment: {
    id: string;
    assigned_at: string;
    template: { id: string; name: string; category: string } | null;
  } | null;
};

type PlayerGroups = {
  subscribed_dashboard_not_app: CoachPlayer[];
  subscribed_dashboard_and_app: CoachPlayer[];
  not_subscribed_in_dashboard_but_app: CoachPlayer[];
  duplicate_phone_needs_staff_fix: CoachPlayer[];
  incomplete_app_profile: CoachPlayer[];
  registered_in_app: CoachPlayer[];
  auth_account_without_app_profile: CoachPlayer[];
};

export default function CoachPlayersPage() {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [players, setPlayers] = useState<CoachPlayer[]>([]);
  const [groups, setGroups] = useState<PlayerGroups>({
    subscribed_dashboard_not_app: [],
    subscribed_dashboard_and_app: [],
    not_subscribed_in_dashboard_but_app: [],
    duplicate_phone_needs_staff_fix: [],
    incomplete_app_profile: [],
    registered_in_app: [],
    auth_account_without_app_profile: [],
  });
  const [programs, setPrograms] = useState<WorkoutProgramTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const [assigningTemplateId, setAssigningTemplateId] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<WorkoutTemplateExercise | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [playersRes, programsRes] = await Promise.all([
        fetch("/api/coach/players"),
        fetch("/api/coach/workout-programs"),
      ]);

      const playersJson = await playersRes.json();
      const programsJson = await programsRes.json();

      if (!playersRes.ok || !playersJson.success) throw new Error(playersJson.error ?? "Failed to load players");
      if (!programsRes.ok || !programsJson.success) throw new Error(programsJson.error ?? "Failed to load programs");

      const eligiblePlayers = playersJson.data ?? [];
      setPlayers(eligiblePlayers);
      setGroups(playersJson.groups ?? {
        subscribed_dashboard_not_app: [],
        subscribed_dashboard_and_app: eligiblePlayers,
        not_subscribed_in_dashboard_but_app: [],
        duplicate_phone_needs_staff_fix: [],
        incomplete_app_profile: [],
        registered_in_app: eligiblePlayers,
        auth_account_without_app_profile: [],
      });
      setPrograms((programsJson.data ?? []).filter((program: WorkoutProgramTemplate) => program.is_active));
      setSelectedPlayerId((current) => eligiblePlayers.some((player: CoachPlayer) => player.id === current) ? current : eligiblePlayers[0]?.id ?? null);
    } catch (err) {
      toastError("Load failed", err instanceof Error ? err.message : "Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter((player) =>
      player.full_name.toLowerCase().includes(q)
      || (player.phone?.toLowerCase().includes(q) ?? false),
    );
  }, [players, search]);

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) ?? filteredPlayers[0] ?? null;

  function toggleProgram(templateId: string) {
    setExpandedPrograms((prev) => {
      const next = new Set(prev);
      if (next.has(templateId)) next.delete(templateId);
      else next.add(templateId);
      return next;
    });
  }

  async function assignProgram(templateId: string) {
    if (!selectedPlayer) return;
    if (!selectedPlayer.eligible) {
      toastError("Assign blocked", "This member is not eligible for workout assignment.");
      return;
    }
    setAssigningTemplateId(templateId);
    try {
      const res = await fetch("/api/coach/workout-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: selectedPlayer.id, template_id: templateId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError("Assign failed", json.error ?? "Please try again.");
        return;
      }
      const assigned = programs.find((program) => program.id === templateId);
      success("Program assigned", `${assigned?.name ?? "Workout program"} -> ${selectedPlayer.full_name}`);
      await load();
      setSelectedPlayerId(selectedPlayer.id);
    } catch {
      toastError("Network error", "Could not assign the workout program.");
    } finally {
      setAssigningTemplateId(null);
    }
  }

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="font-display text-[28px] tracking-wider text-white">{t("coach.myPlayers")}</h1>
        <p className="text-white/40 text-[13px] mt-1">Coach-only workout assignment workspace</p>
      </div>

      {loading ? (
        <div className="text-white/40 text-center py-12">{t("common.loading")}</div>
      ) : (
        <div className="grid lg:grid-cols-[360px_1fr] gap-5 items-start">
          <section className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("members.searchPlaceholder")}
                className="w-full h-11 pl-10 rtl:pl-4 rtl:pr-10 bg-white/[0.04] border border-white/[0.08] text-white text-[14px] placeholder:text-white/30 focus:border-[#FF6B35]/50 focus:outline-none transition-colors"
              />
            </div>

            {groups.duplicate_phone_needs_staff_fix.length > 0 && (
              <section className="border border-danger/30 bg-danger/[0.04] p-4 mb-1">
                <p className="text-danger text-[13px] font-bold mb-1">
                  تكرار رقم الهاتف — تحتاج تدخّل
                </p>
                <p className="text-white/55 text-[12px] mb-3">
                  هؤلاء الأعضاء لديهم نفس رقم الهاتف. عدّل بيانات أحدهم في صفحة الأعضاء قبل إرسال أي برنامج.
                </p>
                {groups.duplicate_phone_needs_staff_fix.map((p) => (
                  <div key={p.id} className="text-white/70 text-[13px] py-0.5">{p.full_name} — {p.phone}</div>
                ))}
              </section>
            )}

            <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {filteredPlayers.length === 0 && (
                <div className="bg-white/[0.03] border border-white/[0.06] p-5 text-center">
                  <p className="text-white/45 text-[13px]">No eligible linked subscribed players.</p>
                  <p className="text-white/25 text-[11px] mt-1">Dashboard-only and app-only players are listed below for diagnosis.</p>
                </div>
              )}
              {filteredPlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => setSelectedPlayerId(player.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 text-right border transition-colors",
                    selectedPlayer?.id === player.id
                      ? "bg-[#FF6B35]/10 border-[#FF6B35]/35"
                      : "bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.06]",
                  )}
                >
                  <div className="w-10 h-10 bg-[#FF6B35]/10 flex items-center justify-center text-[#FF6B35] font-bold text-[14px]">
                    {player.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[14px] font-medium truncate">{player.full_name}</p>
                    <p className="text-white/40 text-[12px] truncate">{player.phone ?? "No phone"}</p>
                  </div>
                  {player.current_assignment?.template && (
                    <span className="text-[9px] font-mono uppercase text-gold bg-gold/10 px-1.5 py-0.5">
                      Assigned
                    </span>
                  )}
                </button>
              ))}
            </div>
            <DiagnosticGroups groups={groups} />
          </section>

          <section className="space-y-5">
            {selectedPlayer ? (
              <>
                <PlayerProfile player={selectedPlayer} />
                <div className="space-y-3">
                  {programs.map((program) => {
                    const isExpanded = expandedPrograms.has(program.id);
                    const isCurrent = selectedPlayer.current_assignment?.template?.id === program.id;
                    return (
                      <div key={program.id} className="bg-white/[0.04] border border-white/[0.06] overflow-hidden">
                        <div className="p-5 flex items-start gap-4">
                          <div className="w-11 h-11 bg-gold/10 flex items-center justify-center flex-shrink-0">
                            <Dumbbell size={20} className="text-gold" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-white text-[18px] font-semibold">{program.name}</h2>
                              {isCurrent && <span className="bg-gold/10 text-gold text-[10px] font-bold uppercase px-2 py-0.5">Current</span>}
                            </div>
                            <p className="text-white/40 text-[12px] mt-1">
                              {program.category}
                              {program.gender_focus ? ` · ${program.gender_focus}` : ""}
                              {" · "}
                              {program.days.length} days/variants
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleProgram(program.id)}
                              className="w-9 h-9 flex items-center justify-center border border-white/[0.08] text-white/50 hover:text-white hover:border-white/20 transition-colors"
                              aria-label="Expand program"
                            >
                              <ChevronDown size={16} className={cn("transition-transform", isExpanded && "rotate-180")} />
                            </button>
                            <button
                              type="button"
                              onClick={() => assignProgram(program.id)}
                              disabled={assigningTemplateId !== null || !selectedPlayer.eligible}
                              className="flex items-center gap-2 bg-[#FF6B35] text-void px-3 py-2.5 text-[12px] font-bold uppercase tracking-wider hover:bg-[#FF6B35]/90 disabled:opacity-50 transition-colors"
                            >
                              <Send size={14} />
                              {assigningTemplateId === program.id ? "Assigning" : "Assign"}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-white/[0.06] p-5 space-y-3">
                            {program.days.map((day) => (
                              <ProgramDay key={day.id} day={day} onEditMedia={setEditingExercise} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-16 bg-white/[0.03] border border-white/[0.06]">
                <User size={40} className="mx-auto text-white/10 mb-4" />
                <p className="text-white/40 text-[14px]">{t("coach.noPlayersDesc")}</p>
              </div>
            )}
          </section>
        </div>
      )}
      <MediaModal
        exercise={editingExercise}
        onClose={() => setEditingExercise(null)}
        onSaved={async () => {
          setEditingExercise(null);
          await load();
        }}
      />
    </div>
  );
}

function PlayerProfile({ player }: { player: CoachPlayer }) {
  const subDays = player.subscription?.end_date ? daysUntil(player.subscription.end_date) : null;
  const notCompleted = "not completed";
  return (
    <div className="bg-white/[0.04] border border-white/[0.06] p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[#FF6B35] text-[10px] font-mono uppercase tracking-[0.14em] mb-1">Selected Player</p>
          <h2 className="text-white text-[22px] font-semibold">{player.full_name}</h2>
          <p className="text-white/40 text-[13px] flex items-center gap-2 mt-1">
            <Phone size={13} />
            {player.phone ?? "No phone"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white/35 text-[10px] font-mono uppercase tracking-[0.12em]">Current workout</p>
          <p className="text-gold text-[13px] font-semibold mt-1">
            {player.current_assignment?.template?.name ?? "No program assigned"}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mt-5">
        <ProfileStat label="Subscription" value={player.subscription ? `${player.subscription.plan_type} · ${player.subscription.end_date}${subDays != null && subDays >= 0 ? ` · ${subDays}d left` : " · expired"}` : "No subscription"} />
        <ProfileStat label="Height" value={player.height_cm != null ? `${player.height_cm} cm` : notCompleted} />
        <ProfileStat label="Weight" value={player.weight_kg != null ? `${player.weight_kg} kg` : notCompleted} />
        <ProfileStat label="Goal" value={player.fitness_goal ?? player.goals ?? notCompleted} />
        <ProfileStat label="Training level" value={player.training_level ?? notCompleted} />
        <ProfileStat label="Status" value={player.status} />
      </div>

      <div className="grid md:grid-cols-2 gap-3 mt-4">
        <MedicalBlock title="Injuries" values={player.injuries} />
        <MedicalBlock title="Health conditions" values={player.illnesses} />
        <FreeNoteBlock title="Medical notes" value={player.medical_notes} />
        <FreeNoteBlock title="Limitations" value={player.limitations} />
      </div>
    </div>
  );
}

function DiagnosticGroups({ groups }: { groups: PlayerGroups }) {
  return (
    <div className="space-y-2 pt-2">
      <DiagnosticGroup
        title="Registered in App"
        players={groups.registered_in_app}
        tone="blue"
      />
      <DiagnosticGroup
        title="Auth account without app profile"
        players={groups.auth_account_without_app_profile}
        tone="muted"
      />
      <DiagnosticGroup
        title="Subscribed in Dashboard, not in App"
        players={groups.subscribed_dashboard_not_app}
        tone="gold"
      />
      <DiagnosticGroup
        title="In App, not subscribed in Dashboard"
        players={groups.not_subscribed_in_dashboard_but_app}
        tone="danger"
      />
      <DiagnosticGroup
        title="Duplicate phone / needs staff fix"
        players={groups.duplicate_phone_needs_staff_fix}
        tone="danger"
      />
      <DiagnosticGroup
        title="Incomplete app profile"
        players={groups.incomplete_app_profile}
        tone="muted"
      />
    </div>
  );
}

function DiagnosticGroup({ title, players, tone }: { title: string; players: CoachPlayer[]; tone: "gold" | "danger" | "blue" | "muted" }) {
  const colors = {
    gold: "text-gold border-gold/20 bg-gold/[0.04]",
    danger: "text-danger border-danger/20 bg-danger/[0.04]",
    blue: "text-blue-300 border-blue-400/20 bg-blue-400/[0.04]",
    muted: "text-white/50 border-white/10 bg-white/[0.03]",
  };
  const color = colors[tone];
  return (
    <details className={cn("border p-3", color)}>
      <summary className="cursor-pointer text-[12px] font-bold">
        {title} ({players.length})
      </summary>
      <div className="mt-3 space-y-2">
        {players.length === 0 ? (
          <p className="text-white/35 text-[12px]">No players in this group.</p>
        ) : players.map((player) => (
          <div key={player.id} className="bg-black/15 border border-white/[0.05] p-2">
            <p className="text-white/70 text-[12px] font-semibold">{player.full_name}</p>
            <p className="text-white/35 text-[11px]" dir="ltr">{player.phone ?? "No phone"}</p>
            {player.phone_normalized && (
              <p className="text-white/25 text-[10px]" dir="ltr">Normalized: {player.phone_normalized}</p>
            )}
            {player.app_registered_at && (
              <p className="text-white/25 text-[10px]" dir="ltr">App: {new Date(player.app_registered_at).toLocaleDateString()}</p>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-iron/70 border border-white/[0.05] p-3 min-w-0">
      <p className="text-white/30 text-[10px] font-mono uppercase tracking-[0.12em]">{label}</p>
      <p className="text-white/75 text-[13px] mt-1 truncate" title={value}>{value}</p>
    </div>
  );
}

function MedicalBlock({ title, values }: { title: string; values: string[] | null }) {
  const cleaned = (values ?? []).filter((value) => value && value !== "None");
  return (
    <div className="bg-danger/[0.04] border border-danger/10 p-3">
      <p className="text-danger/80 text-[11px] font-bold flex items-center gap-2">
        <HeartPulse size={13} />
        {title}
      </p>
      <p className="text-white/60 text-[13px] mt-2 leading-relaxed">
        {cleaned.length > 0 ? cleaned.join(" · ") : "not completed"}
      </p>
    </div>
  );
}

function FreeNoteBlock({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="bg-danger/[0.04] border border-danger/10 p-3">
      <p className="text-danger/80 text-[11px] font-bold flex items-center gap-2">
        <HeartPulse size={13} />
        {title}
      </p>
      <p className="text-white/60 text-[13px] mt-2 leading-relaxed">
        {value?.trim() ? value : "not completed"}
      </p>
    </div>
  );
}

function ProgramDay({
  day,
  onEditMedia,
}: {
  day: WorkoutProgramTemplate["days"][number];
  onEditMedia: (exercise: WorkoutTemplateExercise) => void;
}) {
  return (
    <div className="bg-iron/70 border border-white/[0.05] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-white font-semibold text-[14px]">
            {day.day_number ? `Day ${day.day_number} · ` : ""}{day.name}
          </p>
          <p className="text-white/35 text-[12px] mt-0.5">
            {day.day_type !== "workout_day" ? day.day_type.replace("_", " ") : day.sets_reps ?? "Flexible"}
          </p>
        </div>
        {day.day_type !== "workout_day" && <AlertTriangle size={16} className="text-gold" />}
      </div>

      {day.exercises.length > 0 && (
        <ExerciseList exercises={day.exercises} onEditMedia={onEditMedia} />
      )}

      {day.sections.map((section) => (
        <div key={section.id} className="mt-4 border-t border-white/[0.06] pt-3">
          <p className="text-[#FF6B35] text-[12px] font-bold mb-2">
            {section.muscle_group ?? section.name}
            {section.sets_reps ? ` · ${section.sets_reps}` : ""}
          </p>
          <ExerciseList exercises={section.exercises} onEditMedia={onEditMedia} />
        </div>
      ))}

      {day.cardio.length > 0 && (
        <div className="mt-3 text-white/55 text-[12px]">
          Cardio: {day.cardio.map((item) => `${item.name} ${item.duration}`).join(" · ")}
        </div>
      )}
      {day.options.length > 0 && (
        <div className="mt-3 text-white/55 text-[12px]">
          Options: {day.options.join(" · ")}
        </div>
      )}
    </div>
  );
}

function ExerciseList({
  exercises,
  onEditMedia,
}: {
  exercises: WorkoutTemplateExercise[];
  onEditMedia: (exercise: WorkoutTemplateExercise) => void;
}) {
  return (
    <div className="mt-3 grid sm:grid-cols-2 gap-2">
      {exercises.map((exercise) => (
        <div key={exercise.id} className="bg-white/[0.03] border border-white/[0.05] px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-white/80 text-[13px] truncate">{exercise.name}</p>
            <button
              type="button"
              onClick={() => onEditMedia(exercise)}
              className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B35] hover:text-gold transition-colors flex-shrink-0"
            >
              Media
            </button>
          </div>
          <p className="text-white/35 text-[11px] mt-0.5">
            {exercise.duration ?? exercise.sets_reps ?? "Coach notes"}
            {exercise.rest ? ` · Rest ${exercise.rest}` : ""}
          </p>
          <p className="text-white/25 text-[10px] mt-1">
            {exercise.media?.demo_image_url || exercise.media?.demo_video_url ? "Demo linked" : "No demo"} · {exercise.media?.machine_image_url ? "Machine linked" : "No machine"}
          </p>
        </div>
      ))}
    </div>
  );
}

function MediaModal({
  exercise,
  onClose,
  onSaved,
}: {
  exercise: WorkoutTemplateExercise | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    machine_name: "",
    machine_image_url: "",
    demo_image_url: "",
    demo_video_url: "",
    instructions: "",
  });

  useEffect(() => {
    if (!exercise) return;
    setForm({
      machine_name: exercise.media?.machine_name ?? "",
      machine_image_url: exercise.media?.machine_image_url ?? "",
      demo_image_url: exercise.media?.demo_image_url ?? "",
      demo_video_url: exercise.media?.demo_video_url ?? "",
      instructions: exercise.media?.instructions ?? "",
    });
  }, [exercise]);

  if (!exercise) return null;

  async function save() {
    if (!exercise?.media?.id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/coach/exercise-media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise_media_id: exercise.media.id,
          machine_name: form.machine_name.trim() || null,
          machine_image_url: form.machine_image_url.trim() || null,
          demo_image_url: form.demo_image_url.trim() || null,
          demo_video_url: form.demo_video_url.trim() || null,
          instructions: form.instructions.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError("Media update failed", json.error ?? "Please try again.");
        return;
      }
      success("Media updated", exercise.name);
      await onSaved();
    } catch {
      toastError("Network error", "Could not update exercise media.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-charcoal border border-white/[0.08] w-full max-w-lg" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 p-5 border-b border-white/[0.06]">
          <div>
            <p className="text-[#FF6B35] text-[10px] font-mono uppercase tracking-[0.14em]">Exercise media</p>
            <h3 className="text-white text-[17px] font-semibold mt-1">{exercise.name}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <MediaInput label="Machine name" value={form.machine_name} onChange={(value) => setForm((prev) => ({ ...prev, machine_name: value }))} />
          <MediaInput label="Machine image path/URL" value={form.machine_image_url} onChange={(value) => setForm((prev) => ({ ...prev, machine_image_url: value }))} />
          <MediaInput label="Demo image path/URL" value={form.demo_image_url} onChange={(value) => setForm((prev) => ({ ...prev, demo_image_url: value }))} />
          <MediaInput label="Demo video URL" value={form.demo_video_url} onChange={(value) => setForm((prev) => ({ ...prev, demo_video_url: value }))} />
          <div>
            <label className="text-white/35 text-[11px] font-bold uppercase tracking-[0.12em]">Instructions</label>
            <textarea
              value={form.instructions}
              onChange={(event) => setForm((prev) => ({ ...prev, instructions: event.target.value }))}
              rows={4}
              className="mt-1 w-full bg-iron border border-steel text-white text-[13px] p-3 focus:border-[#FF6B35]/50 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full bg-[#FF6B35] text-void py-3 text-[13px] font-bold uppercase tracking-wider hover:bg-[#FF6B35]/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving" : "Save media links"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MediaInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="text-white/35 text-[11px] font-bold uppercase tracking-[0.12em]">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full h-10 bg-iron border border-steel text-white text-[13px] px-3 focus:border-[#FF6B35]/50 focus:outline-none"
      />
    </div>
  );
}
