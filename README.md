# OX GYM — Web App

Premium gym management platform built with Next.js 14.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase · Resend · Vercel

---

## Local Setup

### 1. Prerequisites

- Node.js 18.17 or later
- A Supabase account (free tier works)
- A Resend account (free tier: 3,000 emails/month)
- Git

### 2. Clone and install

```bash
git clone https://github.com/your-repo/ox-gym-app.git
cd ox-gym-app
npm install
```

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `RESEND_API_KEY` | resend.com → API Keys |
| `EMAIL_FROM` | A verified domain in Resend |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |
| `CRON_SECRET` | Any random string (use `openssl rand -base64 32`) |

### 4. Set up the database

1. Go to your Supabase project
2. Open **SQL Editor**
3. Paste the contents of `supabase/schema.sql`
4. Click **Run**

This creates all tables, indexes, enums, and seeds sample data.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

You'll be redirected to `/dashboard` automatically.

---

## Folder Structure

```
src/
├── app/
│   ├── (admin)/              # Admin route group (shared layout with sidebar)
│   │   ├── layout.tsx        # Sidebar + main content shell
│   │   ├── dashboard/        # Main dashboard page
│   │   ├── members/          # Member list + detail
│   │   ├── plans/            # Workout plan library
│   │   ├── subscriptions/    # Subscription management
│   │   ├── reminders/        # Reminder logs
│   │   └── settings/         # Gym settings
│   ├── (client)/             # Member portal (Phase 2)
│   │   ├── dashboard/
│   │   ├── workout/
│   │   ├── meals/
│   │   └── profile/
│   ├── api/
│   │   ├── send-plan/        # POST: send workout/meal plan email
│   │   ├── members/          # GET + POST: member CRUD
│   │   └── cron/             # GET: daily reminder job
│   ├── globals.css           # Design system CSS variables + base styles
│   ├── layout.tsx            # Root layout (fonts, metadata)
│   └── page.tsx              # Redirects to /dashboard
│
├── components/
│   ├── ui/                   # Primitive components (Button, Card, Input...)
│   ├── layout/               # Structural components (Sidebar, TopBar...)
│   ├── admin/                # Admin-specific components (MemberRow...)
│   ├── client/               # Member portal components (Phase 2)
│   └── email/                # React Email templates
│
├── lib/
│   ├── utils.ts              # cn(), date helpers, formatters
│   └── supabase.ts           # Supabase client + service client
│
├── types/
│   └── index.ts              # All TypeScript types (mirror DB schema)
│
└── hooks/                    # Custom React hooks (Phase 2)

supabase/
└── schema.sql                # Database schema + seed data
```

---

## Design System

The design system is defined in three places:

| File | Purpose |
|---|---|
| `src/app/globals.css` | CSS variables (colors, spacing, animations) |
| `tailwind.config.ts` | Tailwind tokens mapped from CSS variables |
| `src/components/ui/` | Primitive components using the tokens |

### Brand tokens (quick reference)

```css
/* Colors */
--ox-void:     #0A0A0A   /* Page background */
--ox-gold:     #F5C100   /* Primary brand / CTA */
--ox-red:      #D42B2B   /* Danger / logo accent */
--ox-offwhite: #F0EDE6   /* Body text */

/* Fonts */
--font-display: 'Bebas Neue'  /* Headlines, stats */
--font-body:    'DM Sans'     /* UI, body copy */
--font-mono:    'DM Mono'     /* Labels, metadata */
```

---

## Deploying to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "initial commit"
git push origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Click **Deploy**

### 3. Add environment variables

In Vercel dashboard → Project → Settings → Environment Variables, add all variables from `.env.local.example`.

Set `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL (e.g. `https://ox-gym.vercel.app`).

### 4. Cron job

The `vercel.json` file configures the daily cron at `0 8 * * *` (08:00 UTC).

Vercel cron jobs are available on the **Pro plan**. The cron calls `/api/cron` with your `CRON_SECRET` in the `Authorization` header.

---

## MVP Checklist

- [x] Project scaffold + TypeScript
- [x] Design system (Tailwind + CSS variables)
- [x] Database schema (Supabase)
- [x] Admin dashboard with stats
- [x] Member list with status filters
- [x] Workout plan library
- [x] Send plan API route
- [x] Daily cron job (7-day + 3-day reminders + auto-expire)
- [ ] Add Member form (next)
- [ ] Member detail page (next)
- [ ] Send Plan flow UI (next)
- [ ] Create Plan form (next)
- [ ] Member portal / login (Phase 2)
- [ ] Stripe payments (Phase 2)

---

## Development Commands

```bash
npm run dev          # Start dev server on http://localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run type-check   # TypeScript check (no emit)
```

---

## License

Private. OX Gym. All rights reserved.
