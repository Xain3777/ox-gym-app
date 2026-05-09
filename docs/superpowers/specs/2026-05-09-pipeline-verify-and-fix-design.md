# Reception → App → Coach → Portal Pipeline: Verify & Fix

**Date:** 2026-05-09
**Status:** Design approved; implementation pending
**Scope:** Path A — verify and fix the existing player onboarding + coach assignment pipeline. **No** new features. Meal-plan side is explicitly out of scope.

## Goal

End-to-end confidence that this lifecycle works without manual intervention:

> A person walks into the gym → reception creates them in the dashboard with a subscription → that person installs the app and signs up using the same phone → they complete onboarding in the app → a coach finds them in the unified player list → the coach builds and assigns a workout program → the player sees that program rendered in the portal.

Plus: harden the duplicate-phone policy at the database level.

## Non-Goals

- No work on the meal-plan side (templates, assignments, or portal rendering for meals).
- No new product features. This pass only verifies what is already coded and fixes anything broken.
- No security model changes beyond the duplicate-phone DB constraint.
- No refactor of the workout-template editor, the player-grouping logic, or the portal workout renderer unless we discover a bug.

## What's already built (audit notes)

The pipeline already crosses these boundaries today:

| Surface | File / API | Storage |
|---|---|---|
| Reception create form | `src/app/reception/create/page.tsx` → `POST /api/members` | `members` + `subscriptions` |
| Player signup | `src/app/(auth)/signup/page.tsx` → `POST /api/auth/signup` | `members` (link by phone) + `member_app_profiles` |
| Player onboarding | `src/app/(wizard)/onboarding/page.tsx` → `POST /api/auth/onboarding` | `members` + `member_app_profiles` |
| Coach unified list | `src/app/coach/players/page.tsx` → `GET /api/coach/players` | reads `members` × `subscriptions` × `member_app_profiles` × `member_workout_programs` |
| Coach plan builder | `src/app/coach/plans/page.tsx` → `POST /api/coach/workout-programs` (+ days/exercises) | `workout_program_templates` + children |
| Coach assigns plan | `POST /api/coach/workout-assignments` | `member_workout_programs` |
| Player views plan | `src/app/portal/workouts/page.tsx` → `GET /api/portal/workout` | reads `member_workout_programs` × `workout_program_templates` |

The shape exists. We do not yet have evidence that every step works end-to-end with real data.

## Approach

Hybrid:

1. **Scripted end-to-end smoke test** that exercises every step above with real data against the live Supabase project. Asserts at each boundary; surfaces the first break.
2. **UI inspection pass** on the four pages that the script can't fully cover (loading states, empty states, error UX, duplicate-phone notifications).
3. **Duplicate-phone hardening** at the DB level so duplicates can't slip in even when the API is bypassed.

### Why hybrid

A script proves the data plumbing — that rows land in the right tables, that JOINs resolve, that JWTs reach the right routes. It cannot prove that a loading spinner is shown while the assignment POST is in flight, or that a duplicate-phone warning is visible to reception before they hit Save. Those are caught by reading the UI code with eyes-on intent.

### Order of verification (strict)

Steps depend on each other. We test in dependency order and stop at the first break.

1. **Reception → member + subscription**: `POST /api/members` with full_name + phone + plan_type/start/end/price. Expect 201, expect both rows.
2. **Reception duplicate-phone reject**: repeat (1) with the same phone. Expect 409, no second row.
3. **Player signup links by phone**: `POST /api/auth/signup` with the same phone. Expect:
   - the existing `members` row is updated (`auth_id` set), no new row created
   - a `member_app_profiles` row appears for the auth user
4. **Player onboarding completes**: `POST /api/auth/onboarding` with profile fields. Expect:
   - `members.onboarding_complete = true`
   - matching fields written to `member_app_profiles`
5. **Coach sees the player as eligible**: `GET /api/coach/players` (signed in as a `coach`/`head_coach` JWT). Expect the test player to appear in `groups.subscribed_dashboard_and_app` and have `eligible: true`.
6. **Coach creates a workout program template**: POST a 2-day template. Expect a `workout_program_templates` row with the right children (`workout_template_days` etc.).
7. **Coach assigns the program**: `POST /api/coach/workout-assignments`. Expect a `member_workout_programs` row, `status = active`.
8. **Player fetches the assigned plan**: `GET /api/portal/workout` (player JWT). Expect the assigned template serialized into the day/section/exercise display format.

### Cleanup

The script removes the test member, the test program template, and any subscription / assignment / app_profile rows it created so the verification leaves no residue.

## Duplicate-phone policy (confirmed)

| Layer | Behavior | Status |
|---|---|---|
| Self-signup | Reject with 409 when phone already belongs to another `members` row | Already enforced in `/api/auth/signup` |
| Coach players list | Show duplicates in `duplicate_phone_needs_staff_fix` group, not in the eligible list | Already enforced in `/api/coach/players` |
| Reception form | When the typed phone matches an existing member, show a non-blocking warning ("هذا الرقم موجود مسبقاً — قد يكون نفس الشخص") | **To add** |
| Database | Partial unique index on `phone_normalized` (only enforced when not NULL) so the API rejection is backstopped | **To add as migration 016** |

Reception will edit existing duplicates directly in the dashboard's normal member-edit UI; we do not build a special merge tool.

## Deliverables

| # | Deliverable | Type |
|---|---|---|
| 1 | `scripts/verify_pipeline.mjs` — re-runnable E2E smoke test, checked in | New file |
| 2 | `supabase/migrations/016_members_phone_normalized_unique.sql` — partial unique index | New migration |
| 3 | Defect fixes from the UI inspection pass — loading states, error states, empty states | Edits to existing pages |
| 4 | Duplicate-phone warning banner on `/reception/create` (live as the user types or on blur) | Edit |
| 5 | Verification report posted in chat: `[step → result → fix-applied]` table | Inline output |

## Stop conditions

Implementation is done when **all** of these hold:

- All 8 pipeline steps pass against live Supabase with a fresh test member.
- `members.phone_normalized` has the partial unique index applied.
- The reception form shows a duplicate-phone warning when the typed phone collides with an existing member.
- `npx tsc --noEmit` exits 0.
- `npx next build` exits 0.
- The verification script can be re-run end-to-end at any time and self-cleans.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| The script needs JWTs for two different roles (coach + player). Forging cookies for the SSR client is fragile. | Acquire JWTs via `supabase.auth.signInWithPassword` against existing seed accounts (Coach One for the coach JWT) and the test player's password for the player JWT. Skip the SSR cookie path; hit the APIs directly with `Authorization: Bearer <jwt>`. |
| Live DB pollution if the script aborts mid-run. | Cleanup runs in a `finally` block keyed on the test player's `auth_id` and program template id. Idempotent — re-runs always start clean. |
| The unique index migration fails if the live DB already has duplicate `phone_normalized` rows from earlier testing. | The migration first reports any existing duplicates (with their `id`, `full_name`, `phone_normalized`); it does not create the index until they're cleaned. The user runs the cleanup manually before re-applying. |
| The coach plan-builder UI may have its own internal API endpoints we haven't enumerated. | The script tests the documented assignment API (`/api/coach/workout-assignments`). UI-only flows discovered during the inspection pass get logged but not necessarily fixed within this scope. |

## Out of scope (explicit)

- Meal plans (templates, assignments, rendering)
- Reception "edit member" UI improvements beyond the duplicate-phone warning
- Subscription renewal flow
- Coach-to-player messaging
- Performance / pagination on `/coach/players`
- Any RLS hardening beyond what already exists

## Next step

Spec self-review → user review → invoke `superpowers:writing-plans` to break the deliverables into ordered implementation steps with checkpoints.
