# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Production build
npm run lint       # ESLint
```

There are no test files — TypeScript (`tsc --noEmit`) is the primary correctness check:
```bash
npx tsc --noEmit
```

## Architecture Overview

**Next.js 14 App Router** gym management platform with role-based multi-portal access.

### Route Groups → Portals

The app has four distinct portals, each route-group-scoped with its own layout:

| Route prefix | Role | Layout file |
|---|---|---|
| `/(admin)/` | `manager` | `src/app/(admin)/layout.tsx` |
| `/portal/` | `player` (gym member) | `src/app/portal/layout.tsx` |
| `/coach/` | `coach` | `src/app/coach/layout.tsx` |
| `/reception/` | `reception` | `src/app/reception/layout.tsx` |
| `/(auth)/` | unauthenticated | `src/app/(auth)/layout.tsx` |

Role routing is enforced in `src/middleware.ts` via a `current_user_role` Supabase RPC (a `SECURITY DEFINER` function). **Never rely on cookie-stored roles** — the middleware always resolves role from the DB to prevent the recursive RLS issue on `public.members`.

### Supabase Client Usage

Three clients exist in `src/lib/supabase.ts` — use the right one:

- `createBrowserSupabase()` — Client Components only
- `createServerClient(cookieStore)` — Server Components / Route Handlers (session-scoped, respects RLS)
- `createServiceClient()` — API routes and cron jobs only (bypasses RLS; never expose to browser)

### API Route Auth

All API routes use `src/lib/api-auth.ts`:
```ts
const { ctx, error } = await requireAuth(["manager"], request);
if (error) return error;
// ctx.userId, ctx.memberId, ctx.role are available
```
`requireAuth` validates CSRF origin + Supabase session + role in one call.

### Key Data Flows

- **Members** have one active `subscription` and a `role` column (`player | coach | reception | manager`).
- **Subscription gating**: Portal wraps children in `<SubscriptionBlocker>` which checks expiry. `src/lib/subscription.ts` exports helpers (`isFeatureLocked`, `getDetailedStatus`). There is a 2-day grace period after expiry.
- **Workout/Meal plans** are stored as JSON in `content` columns (`WorkoutDay[]` / `MealDay[]`).
- **Email**: Resend is used for plan delivery and subscription reminders. Daily cron job runs via `/api/cron` (Vercel Pro cron at 08:00 UTC, secured by `CRON_SECRET`).
- **Notifications**: Push notifications stored in `notifications` table; sent via `/api/notifications`.

### i18n

Arabic/English with RTL support. Default locale is Arabic (`ar`). Use the `useTranslation()` hook from `src/lib/i18n.tsx` in any Client Component. Translation keys live in `src/messages/ar.json` and `src/messages/en.json`. The `<html>` element's `lang` and `dir` attributes are set dynamically.

### Design System

Defined across three files:
- `src/app/globals.css` — CSS custom properties (`--ox-void`, `--ox-gold`, `--ox-red`, `--ox-offwhite`)
- `tailwind.config.ts` — tokens mapped from CSS vars (`bg-void`, `text-gold`, etc.)
- `src/components/ui/` — primitive components (Button, Card, Input, Badge, Modal, Toast)

Brand fonts: `Bebas Neue` (display/headlines), `DM Sans` (body), `DM Mono` (labels/metadata).

### Database

Schema lives in `supabase/schema.sql`. Staff seeding in `supabase/seed_staff.sql`. All migrations are in `supabase/migrations/`. Apply schema changes via Supabase SQL Editor.

The `current_user_role` RPC must be a `SECURITY DEFINER` function — this bypasses the recursive RLS on `public.members` that would otherwise prevent staff from reading their own role on login.

### Staff Accounts

Staff metadata (display names, phone→email mapping) lives in `src/lib/staff.ts`. Staff authenticate via phone number mapped to an internal email format (`{digits}@member.oxgym.app`). To add/remove staff: update Supabase Auth users and the `members.role` column.

### Environment Variables

Required in `.env.local` (see `.env.local.example`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET` — authorizes `/api/cron` calls
