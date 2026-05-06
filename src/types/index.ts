// ═══════════════════════════════════════════════════════════════
// OX GYM — SHARED TYPES
// These mirror the Supabase database schema exactly.
// ═══════════════════════════════════════════════════════════════

// ── ENUMS ─────────────────────────────────────────────────────

export type MemberStatus    = "active" | "expiring" | "expired";
export type SubStatus       = "active" | "expired" | "cancelled";
export type SubPlanType     = "monthly" | "quarterly" | "annual";
export type FitnessLevel    = "beginner" | "intermediate" | "advanced";
export type PlanType        = "workout" | "meal";
export type SendStatus      = "sent" | "failed";
export type ReminderType    = "7-day" | "3-day" | "expired";
export type ReminderStatus      = "sent" | "failed" | "skipped";
export type UserRole            = "player" | "coach" | "head_coach" | "reception" | "manager";
export type NotificationType    = "announcement" | "reminder" | "promotion" | "alert";
export type NotificationStatus  = "sent" | "failed" | "pending";
export type NotificationAudience = "all" | "active" | "expiring" | "specific";

// ── DATABASE ENTITIES ─────────────────────────────────────────

export interface Member {
  id:         string;
  auth_id:    string | null;
  role:       UserRole;
  full_name:  string;
  username:   string | null;
  phone:      string | null;
  photo_url:  string | null;
  goals:      string | null;
  level?:     FitnessLevel;
  status:     MemberStatus;
  created_at: string;
}

export interface Subscription {
  id:         string;
  member_id:  string;
  plan_type:  SubPlanType;
  start_date: string;
  end_date:   string;
  status:     SubStatus;
  price:      number | null;
  notes:      string | null;
}

// WorkoutDay describes a single day in a workout plan.
//
// The library-aware fields (exercise_id, exercise_name, muscle_group,
// equipment, image_url, machine_image_url, demo_url, tempo) and the
// looser sets/reps shape were added in migration 016 so the coach
// builder can save manually-filled values without losing the exercise's
// library metadata. Older saved plans only carry { name, sets, reps,
// notes } — every new field is optional so they still parse cleanly.
export interface WorkoutExercise {
  // Legacy / display
  name:   string;          // kept for backward compat with old plans
  sets?:  number | string; // free string ("4" or "" or "as many") — coach fills
  reps?:  string;          // free string — coach fills
  notes?: string;

  // Library-aware fields (added in migration 016)
  exercise_id?:       string | null;
  exercise_name?:     string;
  muscle_group?:      string | null;
  equipment?:         string | null;
  image_url?:         string | null;
  machine_image_url?: string | null;
  demo_url?:          string | null;
  rest?:              string;   // free string — coach fills
  tempo?:             string;   // free string — coach fills (e.g. "3-1-1")
}

export interface WorkoutDay {
  day:              string;   // "Day 1 — Push"
  exercises:        WorkoutExercise[];
  workoutDuration?: number;   // minutes
  cardioDuration?:  number;   // minutes
}

// ── Coach training-system library (migration 016) ─────────────
export interface TrainingSystem {
  id:          string;
  name:        string;
  description: string | null;
  is_active:   boolean;
  sort_order:  number;
  created_at:  string;
  updated_at:  string;
}

export interface TrainingSystemDay {
  id:                 string;
  training_system_id: string;
  day_number:         number | null;
  title:              string;
  focus:              string | null;
  sort_order:         number;
  created_at:         string;
  updated_at:         string;
}

export interface MuscleGroup {
  id:          string;
  name:        string;
  is_active:   boolean;
  sort_order:  number;
  created_at:  string;
  updated_at:  string;
}

export interface Exercise {
  id:                string;
  name:              string;
  muscle_group_id:   string | null;
  equipment:         string | null;
  image_url:         string | null;
  machine_image_url: string | null;
  demo_url:          string | null;
  file_name:         string | null;
  storage_path:      string | null;
  instructions:      string | null;
  is_active:         boolean;
  sort_order:        number;
  created_at:        string;
  updated_at:        string;
}

export interface WorkoutPlan {
  id:             string;
  name:           string;
  category:       string;
  level:          FitnessLevel;
  duration_weeks: number;
  content:        WorkoutDay[];
  created_by:     string;
  split_type?:    string;   // "3-day" | "4-day" | "5-day" | "6-day"
  created_at:     string;
}

export interface MealItem {
  name:     string;
  portion:  string;
  calories: number;
  protein:  number;
  carbs:    number;
  fat:      number;
}

export interface MealDay {
  day:   string;
  meals: { name: string; items: MealItem[] }[];
}

export interface MealPlan {
  id:             string;
  name:           string;
  goal:           string;
  calories_daily: number;
  content:        MealDay[];
  created_by:     string;
  created_at:     string;
}

export interface PlanSend {
  id:        string;
  member_id: string;
  plan_id:   string;
  plan_type: PlanType;
  sent_at:   string;
  sent_by:   string;
  status:    SendStatus;
}

export interface ReminderLog {
  id:         string;
  member_id:  string;
  type:       ReminderType;
  sent_at:    string;
  status:     ReminderStatus;
  email_to:   string;
}

export interface Notification {
  id:         string;
  member_id:  string | null;
  type:       NotificationType;
  title:      string;
  message:    string;
  audience:   NotificationAudience;
  status:     NotificationStatus;
  sent_at:    string;
  created_by: string;
}

// ── MEAL PLAN TYPES ─────────────────────────────────────────

export interface MealMacros {
  protein: number;
  carbs:   number;
  fats:    number;
}

export interface MealMicros {
  vitamins: string;
  minerals: string;
}

export interface MealIngredient {
  name:     string;
  portion:  string;
  calories: number;
  macros:   MealMacros;
  micros?:  MealMicros;
}

export interface MealSlot {
  label:       string;
  type:        "breakfast" | "lunch" | "dinner" | "snack";
  ingredients: MealIngredient[];
  totalMacros: MealMacros;
}

// ── STORE TYPES ─────────────────────────────────────────────

export interface StoreProduct {
  id:          string;
  name:        string;
  description: string;
  category:    "supplement" | "fitness";
  image_url:   string;
  price:       number;
  cta_url?:    string;
}

// ── FEEDBACK TYPES ──────────────────────────────────────────

export interface Feedback {
  id:         string;
  member_id:  string;
  rating:     number;
  comment:    string;
  created_at: string;
}

// ── JOINED / COMPUTED TYPES ───────────────────────────────────

/** Member with their active subscription joined */
export interface MemberWithSub extends Member {
  subscription: Subscription | null;
}

/** Dashboard stats */
export interface DashboardStats {
  total_active:      number;
  expiring_soon:     number;   // within 7 days
  expired:           number;
  plans_sent_month:  number;
}

// ── API REQUEST/RESPONSE TYPES ────────────────────────────────

export interface SendPlanRequest {
  member_id:  string;
  plan_id:    string;
  plan_type:  PlanType;
}

export interface ApiResponse<T = null> {
  success: boolean;
  data?:   T;
  error?:  string;
}

// ── FORM TYPES ────────────────────────────────────────────────

export interface SendNotificationRequest {
  type:       NotificationType;
  title:      string;
  message:    string;
  audience:   NotificationAudience;
  member_id?: string;   // only when audience === "specific"
}

export interface AddMemberForm {
  full_name:  string;
  username:   string;
  phone:      string;
  goals:      string;
  plan_type:  SubPlanType;
  start_date: string;
  end_date:   string;
  price:      string;
}
