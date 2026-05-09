# Coach Player Eligibility And App Profile Data

## Data Sources

- Dashboard member/subscription data:
  - `public.members`: dashboard identity, name, phone, dashboard status, role, legacy mirrored body/profile fields, and `auth_id` when linked to a Supabase Auth app user.
  - `public.subscriptions`: dashboard subscription status, plan type, start date, end date, and payment data.
- Web App onboarding/profile data:
  - `public.member_app_profiles`: app-owned profile data collected from first login/profile onboarding.
  - Fields include `app_user_id`, `linked_member_id`, `full_name`, `phone`, `height_cm`, `weight_kg`, `fitness_goal`, `training_level`, `illnesses`, `injuries`, `medical_notes`, `limitations`, and `onboarding_complete`.
- Linked relation:
  - `member_app_profiles.app_user_id` links to the Supabase Auth user.
  - `member_app_profiles.linked_member_id` links to `members.id`.
  - `members.auth_id` remains the compatibility link used during signup/dashboard matching.
- Workout assignment data:
  - `public.member_workout_programs` stores assigned structured workout templates for members.

## Behavior

- New Web App signup creates or links the dashboard member and creates a `member_app_profiles` row.
- First-login onboarding and profile edits save to Supabase through `member_app_profiles`, not local state only.
- Migration backfill only creates app profile rows for legacy members with completed onboarding, so dashboard-created Auth accounts are not treated as app users just because they have `members.auth_id`.
- The portal profile page still keeps a local draft while editing, but refresh/login reloads saved profile data from Supabase.
- The coach players API returns the main assignable list as only eligible players:
  - active dashboard subscription
  - Web App profile exists
  - stable member/app link exists
- The coach dashboard player count now uses the same `/api/coach/players` eligible list instead of raw `members` rows.
- Diagnostic groups are returned separately:
  - subscribed in Dashboard but not in App
  - subscribed in Dashboard and in App
  - not subscribed in Dashboard but in App
- Assignment API rejects dashboard-only and app-only users server-side.
- Legacy app users are recoverable when their old profile data exists on `members`. Migration `026_recover_legacy_app_profiles_and_audit_view.sql` copies those rows into `member_app_profiles`.
- Supabase view `public.coach_player_profile_audit` shows each player bucket without exposing medical notes.
- Supabase view `public.app_registered_players` lists players with a real Web App profile row plus current active subscription summary.
- `member_app_profiles.app_registered_at` marks actual Web App entry. This is separate from `members.auth_id`, because reception/dashboard can also create Auth users.
- Linked dashboard members are sent to `/portal/profile` after signup so they can complete Web App profile data.
- The portal profile wizard is shown when `member_app_profiles.onboarding_complete` is false, even if localStorage says the browser already onboarded before.
- New login creates/touches `member_app_profiles` for players, so anyone who actually enters the app is saved in the database.
- Signup links by unique normalized phone. Names are not used for automatic linking because duplicate names are common and unsafe.

## Security

- `member_app_profiles` has RLS enabled.
- App users can read/update only their own app profile.
- Coach, head coach, manager, and admin can read linked player app profiles.
- Reception receives a reduced dashboard member field list from `/api/members` and does not receive app medical profile fields.
- Member workout visibility remains tied to the member's own assigned plans.

## Changed Files

- Migration: `supabase/migrations/025_member_app_profiles_and_coach_eligibility.sql`.
- Legacy recovery migration: `supabase/migrations/026_recover_legacy_app_profiles_and_audit_view.sql`.
- App registration marker/view migration: `supabase/migrations/027_mark_app_registered_profiles.sql`.
- Profile helper: `src/lib/member-app-profile.ts`.
- App login profile touch: `src/app/api/auth/login/route.ts`.
- Signup app profile creation: `src/app/api/auth/signup/route.ts`.
- Signup redirect to profile for linked users: `src/app/(auth)/signup/page.tsx`.
- Onboarding Supabase persistence: `src/app/api/auth/onboarding/route.ts`.
- Portal profile API: `src/app/api/portal/profile/route.ts`.
- Portal profile UI: `src/app/portal/profile/page.tsx`.
- Coach players API and grouping: `src/app/api/coach/players/route.ts`.
- Coach assignment eligibility guard: `src/app/api/coach/workout-assignments/route.ts`.
- Coach dashboard eligible-player count: `src/app/coach/page.tsx`.
- Coach assignment UI: `src/app/coach/players/page.tsx`.
- Reception-safe member API response: `src/app/api/members/route.ts`.

## Verification

- `npx tsc --noEmit` passed.
- `npm run lint` passed with one pre-existing warning in `src/app/portal/profile/page.tsx` about hook dependencies.
