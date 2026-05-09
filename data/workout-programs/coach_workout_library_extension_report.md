# Coach Workout Library Extension

## Changed

- Added coach CRUD for structured workout programs, days/variants, exercises, and exercise media links.
- Added custom workout program creation from the coach plans page via `+ برنامج جديد`.
- Added day/variant creation, editing, and deletion with canonical `training`, `rest`, and `flexible` types.
- Added exercise deletion and kept exercise media editable from the exercise editor.
- Kept member workout loading tied to the assigned template data so refreshed member plans use updated Supabase rows.

## Persistence

- Program/day/exercise/media writes go through `/api/coach/workout-programs`.
- Assignment still uses `/api/coach/workout-assignments` for structured templates.
- Migration `021_coach_workout_library_crud.sql` normalizes day types and keeps inactive templates visible to staff while members only see their own assigned active data.
