# Pipeline Verify & Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** End-to-end verification + fix of the reception → app-signup → coach → portal workout pipeline, plus DB-level duplicate-phone hardening.

**Architecture:** A re-runnable Node E2E script exercises every step against live Supabase. Each step is run in dependency order; the first failure is debugged and fixed before moving on. UI defects that scripts can't catch (loading/error/empty states, duplicate-phone notification) are caught by code-reading and fixed inline. A partial-unique-index migration backstops the API rejection of duplicate phones.

**Tech Stack:** Node 25 (`--env-file`), `@supabase/supabase-js`, Next.js 14 App Router, Postgres + RLS via Supabase. Test artifact: a single ESM script in `scripts/`.

**Spec:** [docs/superpowers/specs/2026-05-09-pipeline-verify-and-fix-design.md](../specs/2026-05-09-pipeline-verify-and-fix-design.md)

---

## File Structure

| Path | Purpose |
|---|---|
| `scripts/verify_pipeline.mjs` | New. The E2E smoke test. Idempotent — cleans up before and after. |
| `supabase/migrations/016_members_phone_normalized_unique.sql` | New. Partial unique index on `members.phone_normalized`. |
| `src/components/reception/PhoneCollisionWarning.tsx` | New. Inline live banner for `/reception/create` when phone matches an existing member. |
| `src/app/reception/create/page.tsx` | Modify. Wire the new warning component to the phone field. |
| `src/app/coach/players/page.tsx` | Inspect & possibly modify. Verify duplicate-phone section is prominent. |
| `src/app/coach/plans/page.tsx` | Inspect only — fix only if a defect surfaces. |
| `src/app/portal/workouts/page.tsx` | Inspect only — fix only if a defect surfaces. |
| `src/app/api/auth/signup/route.ts` | Inspect & possibly fix per script-step results. |
| `src/app/api/coach/players/route.ts` | Inspect & possibly fix per script-step results. |
| `src/app/api/coach/workout-assignments/route.ts` | Inspect & possibly fix per script-step results. |
| `src/app/api/portal/workout/route.ts` | Inspect & possibly fix per script-step results. |

---

## Task 1: Pre-flight — survey current code paths

**Files:**
- Read: `src/app/api/members/route.ts`
- Read: `src/app/api/auth/signup/route.ts`
- Read: `src/app/api/auth/onboarding/route.ts`
- Read: `src/app/api/coach/players/route.ts`
- Read: `src/app/api/coach/workout-assignments/route.ts`
- Read: `src/app/api/coach/workout-programs/route.ts`
- Read: `src/app/api/portal/workout/route.ts`
- Read: `src/lib/workout-programs.ts`

- [ ] **Step 1: Read all API routes listed above and record on a scratchpad:**
  - HTTP method
  - Required body fields
  - Response shape on success
  - Response shape on error
  - Which Supabase tables are read/written

- [ ] **Step 2: Confirm DB tables that the pipeline depends on exist**

Run:
```bash
SUPA="https://brkbgabkhoamzmuyyjns.supabase.co"
SVC=$(grep ^SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d= -f2-)
for t in members subscriptions member_app_profiles workout_program_templates workout_template_days member_workout_programs; do
  R=$(curl -s -o /dev/null -w "%{http_code}" -H "apikey: $SVC" -H "Authorization: Bearer $SVC" "$SUPA/rest/v1/$t?select=*&limit=1")
  echo "$t HTTP $R"
done
```

Expected: every table returns `200`. If any returns `404`, halt and surface the missing table — the spec assumes all 5 tables are already present.

- [ ] **Step 3: Identify the coach-program POST route shape**

```bash
grep -n "POST\|export async function" src/app/api/coach/workout-programs/route.ts | head -10
```

Note the request body the program-create route expects (template + days + exercises). The verify script needs to mimic this exactly.

- [ ] **Step 4: Commit scratchpad notes (no code change)**

No commit needed — this task is read-only context-gathering.

---

## Task 2: Scaffold the verify script

**Files:**
- Create: `scripts/verify_pipeline.mjs`

- [ ] **Step 1: Create the script scaffold with shared helpers and the cleanup hook**

```js
// scripts/verify_pipeline.mjs
//
// End-to-end smoke test for: reception → app signup → onboarding →
// coach views player → coach assigns workout → player views workout.
// Re-runnable. Cleans up before AND after so re-runs always start clean.
//
// Usage:
//   node --env-file=.env.local scripts/verify_pipeline.mjs

import { createClient } from "@supabase/supabase-js";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const APP  = "http://localhost:3000";

if (!SUPA || !SVC || !ANON) {
  console.error("Missing env vars");
  process.exit(1);
}

const admin = createClient(SUPA, SVC, { auth: { autoRefreshToken: false, persistSession: false } });

// Test fixtures — phone is intentionally outside the staff seed range
const TEST_PHONE    = "0999000777";
const TEST_PASSWORD = "qq";   // app accepts short pwds; Supabase min is project-config'd
const TEST_NAME     = "VerifyPipeline TestPlayer";
const COACH_EMAIL   = "963911000007@member.oxgym.app";
const COACH_PASS    = "Coach1#OX2026";

let createdAuthId = null;
let createdMemberId = null;
let createdTemplateId = null;
let createdAssignmentId = null;

const log = (icon, msg) => console.log(`${icon}  ${msg}`);
const fail = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };
const pass = (msg) => log("✓", msg);

async function cleanup(reason = "done") {
  log("⌫", `cleanup (${reason})`);
  // Order: assignment → template → member_app_profile → members → auth.users
  if (createdAssignmentId) {
    await admin.from("member_workout_programs").delete().eq("id", createdAssignmentId);
  }
  if (createdTemplateId) {
    await admin.from("workout_program_templates").delete().eq("id", createdTemplateId);
  }
  // Always purge by phone — handles re-runs that died mid-flight
  const { data: existingMembers } = await admin
    .from("members")
    .select("id, auth_id")
    .eq("phone_normalized", TEST_PHONE);
  for (const m of existingMembers ?? []) {
    if (m.auth_id) {
      await admin.from("member_app_profiles").delete().eq("app_user_id", m.auth_id);
      await admin.auth.admin.deleteUser(m.auth_id);
    }
    await admin.from("subscriptions").delete().eq("member_id", m.id);
    await admin.from("members").delete().eq("id", m.id);
  }
}

process.on("uncaughtException", async (e) => { console.error(e); await cleanup("crash"); process.exit(1); });
process.on("unhandledRejection", async (e) => { console.error(e); await cleanup("reject"); process.exit(1); });

async function main() {
  await cleanup("pre-run");
  // step calls go here
  await cleanup("post-run");
  log("✓", "all steps passed");
}

main();
```

- [ ] **Step 2: Run the scaffold to verify it boots and the env loads**

Run:
```bash
node --env-file=.env.local scripts/verify_pipeline.mjs
```

Expected output:
```
⌫  cleanup (pre-run)
⌫  cleanup (post-run)
✓  all steps passed
```

- [ ] **Step 3: Commit**

```bash
git add scripts/verify_pipeline.mjs
git commit -m "Scaffold scripts/verify_pipeline.mjs with cleanup harness"
```

---

## Task 3: Step 1 — reception creates member

**Files:**
- Modify: `scripts/verify_pipeline.mjs`

- [ ] **Step 1: Acquire a manager JWT (for /api/members POST CSRF) and add the step function**

Add above `main()`:

```js
async function tokenFor(email, password) {
  const res = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "apikey": ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error(`token fetch failed for ${email}: ${JSON.stringify(j)}`);
  return j.access_token;
}

const MANAGER_EMAIL = "963911000001@member.oxgym.app";
const MANAGER_PASS  = "Manager#OX2026";

async function step1_receptionCreatesMember() {
  log("→", "step 1: reception creates member + subscription");
  const jwt = await tokenFor(MANAGER_EMAIL, MANAGER_PASS);
  const today = new Date().toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + 30 * 86400e3).toISOString().slice(0, 10);

  const res = await fetch(`${APP}/api/members`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie":       `sb-access-token=${jwt}`,        // crude but works locally
      "Origin":       APP,
    },
    body: JSON.stringify({
      full_name: TEST_NAME,
      phone:     TEST_PHONE,
      plan_type: "monthly",
      start_date: today,
      end_date:   endDate,
      price:      35,
    }),
  });
  if (res.status !== 201) fail(`expected 201, got ${res.status}: ${await res.text()}`);
  const body = await res.json();
  if (!body?.data?.id) fail(`no member id in response`);
  createdMemberId = body.data.id;
  pass(`member created (id=${createdMemberId})`);

  // Verify the member + subscription rows exist
  const { data: m } = await admin.from("members").select("id, full_name, phone, role").eq("id", createdMemberId).single();
  if (!m || m.role !== "player") fail(`member row malformed: ${JSON.stringify(m)}`);
  const { data: subs } = await admin.from("subscriptions").select("id, plan_type, status").eq("member_id", createdMemberId);
  if (!subs?.length) fail(`no subscription row created`);
  pass(`subscription row found (plan_type=${subs[0].plan_type})`);
}
```

Update `main()`:

```js
async function main() {
  await cleanup("pre-run");
  await step1_receptionCreatesMember();
  await cleanup("post-run");
  log("✓", "all steps passed");
}
```

- [ ] **Step 2: Run and observe**

Run: `node --env-file=.env.local scripts/verify_pipeline.mjs`

Expected: `step 1` logs "member created" + "subscription row found" then cleanup runs.

If FAIL — debug protocol:
- 401/403: cookie format wrong. Try `Authorization: Bearer ${jwt}` instead of cookie.
- 400 validation: read the error body, fix the request payload to match what `src/app/api/members/route.ts` expects.
- 500: check dev server log `/tmp/oxgym-dev.log` and grep for the stack trace.
- Once fixed, re-run.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify_pipeline.mjs
git commit -m "verify: step 1 — reception creates member + subscription"
```

---

## Task 4: Step 2 — duplicate-phone rejection

**Files:**
- Modify: `scripts/verify_pipeline.mjs`

- [ ] **Step 1: Add the step**

```js
async function step2_duplicatePhoneRejected() {
  log("→", "step 2: second create with same phone is rejected");
  const jwt = await tokenFor(MANAGER_EMAIL, MANAGER_PASS);
  const today = new Date().toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + 30 * 86400e3).toISOString().slice(0, 10);

  const res = await fetch(`${APP}/api/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${jwt}`, "Origin": APP },
    body: JSON.stringify({
      full_name: TEST_NAME + " 2",
      phone:     TEST_PHONE,
      plan_type: "monthly",
      start_date: today, end_date: endDate, price: 35,
    }),
  });
  if (res.status !== 409) fail(`expected 409, got ${res.status}: ${await res.text()}`);
  pass(`duplicate phone correctly rejected with 409`);
}
```

Update `main()` to call `step2_duplicatePhoneRejected()` after step 1.

- [ ] **Step 2: Run and observe**

Run: `node --env-file=.env.local scripts/verify_pipeline.mjs`

Expected: step 1 + step 2 both pass.

If FAIL — debug:
- Got 201 instead of 409: the duplicate-phone check in `/api/members` POST is broken. Open `src/app/api/members/route.ts` and find where it checks for existing phone; ensure it queries `phone_normalized` (not raw `phone`).

- [ ] **Step 3: Commit**

```bash
git add scripts/verify_pipeline.mjs
git commit -m "verify: step 2 — duplicate-phone rejection"
```

---

## Task 5: Step 3 — player signup links by phone

**Files:**
- Modify: `scripts/verify_pipeline.mjs`

- [ ] **Step 1: Add the step**

```js
async function step3_playerSignupLinks() {
  log("→", "step 3: player self-signup links to existing member by phone");
  const res = await fetch(`${APP}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": APP },
    body: JSON.stringify({ full_name: TEST_NAME, phone: TEST_PHONE, password: TEST_PASSWORD }),
  });
  if (res.status !== 200) fail(`signup expected 200, got ${res.status}: ${await res.text()}`);
  const body = await res.json();
  if (!body?.success || !body?.data?.user_id) fail(`signup body malformed`);
  createdAuthId = body.data.user_id;

  // We must NOT have created a second members row
  const { data: rows } = await admin.from("members").select("id, auth_id").eq("phone_normalized", TEST_PHONE);
  if (rows.length !== 1) fail(`expected exactly 1 member row for the phone, got ${rows.length}`);
  if (rows[0].id !== createdMemberId) fail(`signup created a new row instead of linking to ${createdMemberId}`);
  if (rows[0].auth_id !== createdAuthId) fail(`existing member row was not linked: auth_id=${rows[0].auth_id}, expected ${createdAuthId}`);

  // member_app_profiles row must exist
  const { data: prof } = await admin.from("member_app_profiles").select("id").eq("app_user_id", createdAuthId).maybeSingle();
  if (!prof) fail(`no member_app_profiles row created`);

  pass(`signup linked auth_id=${createdAuthId} to member ${createdMemberId}`);
}
```

Update `main()` to call after step 2.

- [ ] **Step 2: Run and observe**

Run: `node --env-file=.env.local scripts/verify_pipeline.mjs`

Expected: all 3 steps pass.

Common debug:
- "expected exactly 1 member row, got 2": signup created a new row instead of linking. Open `src/app/api/auth/signup/route.ts`, check the `existing` lookup queries `phone_normalized` and the linking branch updates the existing row's `auth_id`.
- 409 "Duplicate phone…": signup is rejecting because the existing dashboard row already has `auth_id` from a prior crashed run. Confirm cleanup runs at the start of `main()`.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify_pipeline.mjs
git commit -m "verify: step 3 — player signup links by phone"
```

---

## Task 6: Step 4 — onboarding completes

**Files:**
- Modify: `scripts/verify_pipeline.mjs`

- [ ] **Step 1: Add the step (uses the player JWT)**

```js
async function step4_onboardingCompletes() {
  log("→", "step 4: player completes onboarding");
  const playerJwt = await tokenFor(`${TEST_PHONE}@member.oxgym.app`, TEST_PASSWORD);

  const res = await fetch(`${APP}/api/auth/onboarding`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${playerJwt}`, "Origin": APP },
    body: JSON.stringify({
      fitness_goal:   "hypertrophy",
      training_level: "intermediate",
      illnesses:      [],
      injuries:       [],
      date_of_birth:  "2000-01-01",
      gender:         "male",
      weight_kg:      80,
      height_cm:      180,
      medical_notes:  null,
      limitations:    null,
    }),
  });
  if (res.status !== 200) fail(`onboarding expected 200, got ${res.status}: ${await res.text()}`);

  const { data: m } = await admin.from("members").select("onboarding_complete, fitness_goal, training_level").eq("id", createdMemberId).single();
  if (!m?.onboarding_complete) fail(`members.onboarding_complete still false`);

  const { data: prof } = await admin.from("member_app_profiles").select("onboarding_complete, fitness_goal, training_level, weight_kg, height_cm").eq("app_user_id", createdAuthId).single();
  if (!prof?.onboarding_complete) fail(`member_app_profiles.onboarding_complete still false`);
  if (prof.weight_kg !== 80 || prof.height_cm !== 180) fail(`profile body metrics not stored correctly`);
  pass(`onboarding wrote both members and member_app_profiles`);
}
```

- [ ] **Step 2: Run and observe**

Run: `node --env-file=.env.local scripts/verify_pipeline.mjs`

Common debug:
- 401: `Authorization: Bearer` header isn't reaching the route. The route uses cookies via `cookies()` from `next/headers`. For a JWT-bearer test we need the route to ALSO accept Bearer. Either modify the route to read `request.headers.get("authorization")` OR use a cookie-emitting login flow. Quickest fix: have the script POST to `/api/auth/onboarding` with both header and cookie. If still 401, fall back to using the Supabase Auth API's cookie response.
- 500: read the dev log; likely a missing column on `member_app_profiles`. Cross-check the columns the route writes against `supabase/migrations/015_member_app_profiles.sql`.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify_pipeline.mjs
git commit -m "verify: step 4 — onboarding completes"
```

---

## Task 7: Step 5 — coach sees player as eligible

**Files:**
- Modify: `scripts/verify_pipeline.mjs`

- [ ] **Step 1: Add the step (uses the coach JWT)**

```js
async function step5_coachSeesEligible() {
  log("→", "step 5: coach sees the test player in eligible group");
  const coachJwt = await tokenFor(COACH_EMAIL, COACH_PASS);

  const res = await fetch(`${APP}/api/coach/players`, {
    headers: { "Authorization": `Bearer ${coachJwt}` },
  });
  if (res.status !== 200) fail(`expected 200, got ${res.status}: ${await res.text()}`);
  const body = await res.json();

  const eligible = (body.data ?? []).find((p) => p.id === createdMemberId);
  if (!eligible) fail(`test player not in eligible list. Got ids: ${(body.data ?? []).map(p => p.id).join(", ")}`);
  if (!eligible.has_app_registration) fail(`has_app_registration is false`);
  if (!eligible.has_dashboard_subscription) fail(`has_dashboard_subscription is false`);
  pass(`coach sees the player as eligible`);
}
```

- [ ] **Step 2: Run and observe**

Same debug protocol as step 4 if 401. If `eligible: false`, log the full row and inspect which flag is wrong; cross-reference the eligibility computation in `src/app/api/coach/players/route.ts:81`.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify_pipeline.mjs
git commit -m "verify: step 5 — coach sees player as eligible"
```

---

## Task 8: Step 6 — coach creates workout program

**Files:**
- Modify: `scripts/verify_pipeline.mjs`

- [ ] **Step 1: First read the workout-programs POST contract**

```bash
cat src/app/api/coach/workout-programs/route.ts | head -120
```

Note the exact request body it expects. The next step's payload must match.

- [ ] **Step 2: Add the step (use the contract you just read)**

```js
async function step6_coachCreatesProgram() {
  log("→", "step 6: coach creates a workout program template");
  const coachJwt = await tokenFor(COACH_EMAIL, COACH_PASS);

  // Adjust this payload to the actual API contract from the previous step.
  const payload = {
    name:     "Verify Pipeline 2-Day",
    category: "general",
    days: [
      {
        name: "Day 1",
        sections: [{
          name: "Push",
          exercises: [
            { name: "Bench Press",   sets_reps: "4 x 8" },
            { name: "Shoulder Press", sets_reps: "3 x 10" },
          ],
        }],
      },
      {
        name: "Day 2",
        sections: [{
          name: "Pull",
          exercises: [
            { name: "Pulldown",  sets_reps: "4 x 10" },
            { name: "Seated Row", sets_reps: "3 x 12" },
          ],
        }],
      },
    ],
  };

  const res = await fetch(`${APP}/api/coach/workout-programs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${coachJwt}`, "Origin": APP },
    body: JSON.stringify(payload),
  });
  if (res.status !== 200 && res.status !== 201) fail(`expected 200/201, got ${res.status}: ${await res.text()}`);
  const body = await res.json();
  createdTemplateId = body?.data?.id ?? body?.id;
  if (!createdTemplateId) fail(`no template id in response: ${JSON.stringify(body)}`);
  pass(`template created (id=${createdTemplateId})`);
}
```

- [ ] **Step 3: Run and observe**

Adjust payload until it succeeds. Verify in DB:
```bash
SUPA="https://brkbgabkhoamzmuyyjns.supabase.co"
SVC=$(grep ^SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d= -f2-)
curl -s -H "apikey: $SVC" -H "Authorization: Bearer $SVC" "$SUPA/rest/v1/workout_program_templates?select=*&order=created_at.desc&limit=3"
```

- [ ] **Step 4: Commit**

```bash
git add scripts/verify_pipeline.mjs
git commit -m "verify: step 6 — coach creates workout program"
```

---

## Task 9: Step 7 — coach assigns the program

**Files:**
- Modify: `scripts/verify_pipeline.mjs`

- [ ] **Step 1: Add the step**

```js
async function step7_coachAssignsProgram() {
  log("→", "step 7: coach assigns program to the player");
  const coachJwt = await tokenFor(COACH_EMAIL, COACH_PASS);

  const res = await fetch(`${APP}/api/coach/workout-assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${coachJwt}`, "Origin": APP },
    body: JSON.stringify({
      member_id:   createdMemberId,
      template_id: createdTemplateId,
      notes:       "Verify pipeline test assignment",
    }),
  });
  if (res.status !== 200 && res.status !== 201) fail(`expected 200/201, got ${res.status}: ${await res.text()}`);
  const body = await res.json();
  createdAssignmentId = body?.data?.id ?? body?.id;
  if (!createdAssignmentId) fail(`no assignment id in response: ${JSON.stringify(body)}`);

  const { data: row } = await admin.from("member_workout_programs").select("id, status, member_id, template_id").eq("id", createdAssignmentId).single();
  if (row.status !== "active") fail(`assignment status not active: ${row.status}`);
  pass(`assignment created (id=${createdAssignmentId}, status=active)`);
}
```

- [ ] **Step 2: Run and observe**

If 422/400, re-read `src/app/api/coach/workout-assignments/route.ts` for the exact body schema (already includes `member_id`, `template_id`, `notes`).

- [ ] **Step 3: Commit**

```bash
git add scripts/verify_pipeline.mjs
git commit -m "verify: step 7 — coach assigns program to player"
```

---

## Task 10: Step 8 — player fetches assigned plan

**Files:**
- Modify: `scripts/verify_pipeline.mjs`

- [ ] **Step 1: Add the step**

```js
async function step8_playerFetchesPlan() {
  log("→", "step 8: player fetches their assigned workout plan");
  const playerJwt = await tokenFor(`${TEST_PHONE}@member.oxgym.app`, TEST_PASSWORD);

  const res = await fetch(`${APP}/api/portal/workout`, {
    headers: { "Authorization": `Bearer ${playerJwt}` },
  });
  if (res.status !== 200) fail(`expected 200, got ${res.status}: ${await res.text()}`);
  const body = await res.json();
  if (!body?.data?.content?.length) fail(`no plan content returned: ${JSON.stringify(body)}`);
  if (body.data.content.length !== 2) fail(`expected 2 days, got ${body.data.content.length}`);
  pass(`player received ${body.data.content.length}-day plan`);
}
```

- [ ] **Step 2: Run and observe**

Common debug:
- `null` data: the API didn't find an active assignment. Check that the assignment row's `status` is exactly `"active"` and `member_id` matches the player's member id.
- Days returned but empty `sections`: `loadTemplateDays` in `src/lib/workout-programs.ts` may not be loading the template's children. Inspect.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify_pipeline.mjs
git commit -m "verify: step 8 — player fetches assigned plan"
```

---

## Task 11: Audit existing duplicate phones in DB

**Files:** none modified

- [ ] **Step 1: Find existing duplicates that would block the unique index**

```bash
SUPA="https://brkbgabkhoamzmuyyjns.supabase.co"
SVC=$(grep ^SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d= -f2-)
curl -s -H "apikey: $SVC" -H "Authorization: Bearer $SVC" \
  "$SUPA/rest/v1/members?select=id,full_name,phone,phone_normalized,auth_id,role,created_at&order=phone_normalized,created_at" \
  | python3 -c "
import json, sys
rows = json.load(sys.stdin)
counts = {}
for r in rows:
    p = r.get('phone_normalized')
    if p: counts.setdefault(p, []).append(r)
dups = {k:v for k,v in counts.items() if len(v) > 1}
if not dups:
    print('No duplicates — safe to apply migration 016 directly.')
else:
    print(f'{len(dups)} duplicate phone(s):')
    for p, rs in dups.items():
        print(f'  phone={p}:')
        for r in rs:
            print(f'    id={r[\"id\"]} full_name={r[\"full_name\"]!r} auth_id={r[\"auth_id\"]} role={r[\"role\"]}')
"
```

- [ ] **Step 2: If duplicates exist, ask the user which row to keep, then DELETE the others using the service-role REST API.** Otherwise proceed to Task 12.

---

## Task 12: Migration 016 — phone_normalized unique index

**Files:**
- Create: `supabase/migrations/016_members_phone_normalized_unique.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 016: Backstop the API rejection of duplicate phones with a partial
-- unique index. Partial because legacy rows may have NULL
-- phone_normalized; we only enforce uniqueness on real values.
--
-- Run cleanup first (see plan Task 11) — this CREATE will fail if there
-- are existing duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_phone_normalized_unique
  ON public.members (phone_normalized)
  WHERE phone_normalized IS NOT NULL;
```

- [ ] **Step 2: Tell the user to paste it into Supabase SQL Editor → Run**

Wait for confirmation, then verify:
```bash
SUPA="https://brkbgabkhoamzmuyyjns.supabase.co"
SVC=$(grep ^SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d= -f2-)
# Try to insert two rows with the same phone_normalized via service role.
# Should fail on the second with a 23505 unique violation.
curl -s -X POST -H "apikey: $SVC" -H "Authorization: Bearer $SVC" -H "Content-Type: application/json" \
  "$SUPA/rest/v1/members" \
  -d '{"full_name":"DupTest A","phone":"0999998888","phone_normalized":"0999998888","role":"player","status":"active"}'
echo
echo "---"
curl -s -X POST -H "apikey: $SVC" -H "Authorization: Bearer $SVC" -H "Content-Type: application/json" \
  "$SUPA/rest/v1/members" \
  -d '{"full_name":"DupTest B","phone":"0999998888","phone_normalized":"0999998888","role":"player","status":"active"}'
echo
# Cleanup the test row(s)
curl -s -X DELETE -H "apikey: $SVC" -H "Authorization: Bearer $SVC" "$SUPA/rest/v1/members?phone_normalized=eq.0999998888" -o /dev/null
```

Expected: first POST returns 201, second returns 409 with code 23505.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/016_members_phone_normalized_unique.sql
git commit -m "Add migration 016 — partial unique index on members.phone_normalized"
```

---

## Task 13: Duplicate-phone warning component for reception

**Files:**
- Create: `src/components/reception/PhoneCollisionWarning.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  phone: string;       // raw input
  className?: string;
}

interface Match {
  id: string;
  full_name: string;
}

// Calls a new GET endpoint to look up if the phone is already taken.
// Debounced 350ms. Renders nothing while idle / no match.
export function PhoneCollisionWarning({ phone, className }: Props) {
  const [match, setMatch] = useState<Match | null>(null);

  useEffect(() => {
    setMatch(null);
    const trimmed = phone.trim();
    if (trimmed.length < 7) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/members/lookup-phone?phone=${encodeURIComponent(trimmed)}`);
        if (cancelled) return;
        if (!r.ok) return;
        const j = await r.json();
        if (j?.data) setMatch(j.data as Match);
      } catch { /* network jitter — ignore */ }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [phone]);

  if (!match) return null;

  return (
    <div className={`flex items-start gap-2 mt-2 p-3 bg-gold/10 border border-gold/30 ${className ?? ""}`} dir="rtl">
      <AlertTriangle size={14} className="text-gold flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-gold text-[12px] font-semibold">هذا الرقم موجود مسبقاً</p>
        <p className="text-white/55 text-[11px] mt-0.5">
          مسجّل باسم <span className="text-white">{match.full_name}</span> — قد يكون نفس الشخص.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/reception/PhoneCollisionWarning.tsx
git commit -m "Add PhoneCollisionWarning component for reception form"
```

---

## Task 14: Lookup-phone API endpoint

**Files:**
- Create: `src/app/api/members/lookup-phone/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { normalizePhone } from "@/lib/phone";

// GET /api/members/lookup-phone?phone=...
// Returns the first member whose phone_normalized matches, so the
// reception form can warn live before submission. Manager + reception
// only — players have no business looking other members up by phone.
export async function GET(request: Request) {
  const { error } = await requireAuth(["manager", "reception"], request);
  if (error) return error;

  const url = new URL(request.url);
  const raw = url.searchParams.get("phone")?.trim() ?? "";
  if (!raw) return NextResponse.json({ success: true, data: null });

  const normalized = normalizePhone(raw);
  if (!normalized) return NextResponse.json({ success: true, data: null });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("members")
    .select("id, full_name")
    .eq("phone_normalized", normalized)
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ success: true, data: data ?? null });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/members/lookup-phone/route.ts
git commit -m "Add /api/members/lookup-phone for reception duplicate warning"
```

---

## Task 15: Wire the warning into the reception form

**Files:**
- Modify: `src/app/reception/create/page.tsx`

- [ ] **Step 1: Find the phone input in the form and add the warning beneath it**

```bash
grep -n "name.*phone\|phone\|الهاتف" src/app/reception/create/page.tsx
```

Locate the `<input>` for the phone field. Right after its closing tag (and any existing inline error message), add:

```tsx
<PhoneCollisionWarning phone={form.phone} />
```

Add the import at the top:

```tsx
import { PhoneCollisionWarning } from "@/components/reception/PhoneCollisionWarning";
```

- [ ] **Step 2: Type-check + visual smoke**

Run: `npx tsc --noEmit`
Expected: exit 0.

Then start the dev server (`npm run dev`), log in as `Manager OX`/`Manager#OX2026`, navigate to `/reception/create`, type a known-existing phone (e.g. `0911000001` for Manager OX). Expect the gold warning banner to appear within ~1s.

- [ ] **Step 3: Commit**

```bash
git add src/app/reception/create/page.tsx
git commit -m "Show duplicate-phone warning live on reception create form"
```

---

## Task 16: UI inspection pass — coach players

**Files:**
- Inspect (read-only first): `src/app/coach/players/page.tsx`

- [ ] **Step 1: Open the file and verify these UX requirements**

1. The `duplicate_phone_needs_staff_fix` group is rendered as its own section, with a clearly labeled header (e.g. "تكرار رقم — يحتاج تدخل").
2. The section explains what the staff should do (edit one of the rows).
3. Members in this section are NOT shown a "Send program" button (the assign action is locked).

- [ ] **Step 2: If any of the three is missing, fix inline.** A typical fix:

```tsx
{groups.duplicate_phone_needs_staff_fix.length > 0 && (
  <section className="border border-danger/30 bg-danger/[0.04] p-4">
    <p className="text-danger text-[13px] font-bold mb-1">
      تكرار رقم الهاتف — تحتاج تدخّل
    </p>
    <p className="text-white/55 text-[12px] mb-3">
      هؤلاء الأعضاء لديهم نفس رقم الهاتف. عدّل بيانات أحدهم في صفحة الأعضاء قبل إرسال أي برنامج.
    </p>
    {groups.duplicate_phone_needs_staff_fix.map((p) => (
      <div key={p.id} className="text-white/70 text-[13px]">{p.full_name} — {p.phone}</div>
    ))}
  </section>
)}
```

(Place near the top of the player listing, above the eligible group.)

- [ ] **Step 3: Type-check, commit only if you changed code**

Run: `npx tsc --noEmit` → 0.

```bash
git add src/app/coach/players/page.tsx
git commit -m "Make duplicate-phone group prominent in coach players list"
```

---

## Task 17: UI inspection pass — coach plans + portal workouts

**Files:**
- Inspect: `src/app/coach/plans/page.tsx`
- Inspect: `src/app/portal/workouts/page.tsx`

- [ ] **Step 1: Coach plans — check these states**

1. Loading state while `programs` array hydrates — currently look for `loading` state and a placeholder.
2. Empty state when there are no programs yet — should NOT show a blank screen.
3. The "Send" / "Assign" affordance is disabled for non-eligible players (no app account, etc.).

If any are missing, fix inline. Empty-state pattern (place where the program list renders):

```tsx
{!loading && programs.length === 0 && (
  <div className="text-center py-12 text-white/40 text-[14px]">
    لم يتم إنشاء أي برنامج بعد. اضغط <span className="text-gold">إنشاء برنامج</span> للبدء.
  </div>
)}
```

- [ ] **Step 2: Portal workouts — check these states**

1. While `/api/portal/workout` is in flight: a loading skeleton (not the mock fallback list).
2. When the API returns `data: null` (no plan assigned): a clear "لا يوجد برنامج بعد — مدربك سيخصّص لك واحداً قريباً" message, NOT the mock data.
3. Make sure `mockWorkoutDays` is no longer rendered to real users (it should be guarded behind a dev flag or removed).

Patch shape (top of the page component):

```tsx
if (loading) return (<div className="p-8 text-white/40">جاري التحميل…</div>);
if (!days || days.length === 0) return (
  <div className="p-8 text-center text-white/55">
    لا يوجد برنامج بعد. مدربك سيخصّص لك واحداً قريباً.
  </div>
);
```

- [ ] **Step 3: Type-check + commit if you changed anything**

Run: `npx tsc --noEmit`

```bash
git add src/app/coach/plans/page.tsx src/app/portal/workouts/page.tsx
git commit -m "Tighten loading/empty states on coach plans + portal workouts"
```

---

## Task 18: Final verification

**Files:** none modified

- [ ] **Step 1: Re-run the verify script end-to-end**

```bash
node --env-file=.env.local scripts/verify_pipeline.mjs
```

Expected: all 8 step lines print `✓` and the script exits 0. No leftover rows in `members` for `TEST_PHONE`.

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Production build**

```bash
npx next build > /tmp/build.log 2>&1; echo "exit=$?"; tail -5 /tmp/build.log
```

Expected: exit 0.

- [ ] **Step 4: Post the verification report to chat**

Format:

```
| Step | Result | Fix applied? |
|---|---|---|
| 1. Reception creates member | ✓ | (none / brief description) |
| 2. Duplicate phone rejected | ✓ | … |
| … | … | … |
| 8. Player fetches plan | ✓ | … |

Schema: phone_normalized partial unique index ✓
UI: duplicate-phone live banner on /reception/create ✓
UI: duplicate-phone section visible on /coach/players ✓
UI: loading / empty states tightened on plan + workouts pages ✓
tsc --noEmit: exit 0 ✓
next build: exit 0 ✓
```

- [ ] **Step 5: Optional — commit a CHANGELOG/note if the codebase has one**

The project doesn't have a CHANGELOG; skip unless explicitly asked.

---

## Self-review checklist

- **Spec coverage:** Tasks 2–10 cover the 8 verification steps. Task 11 covers existing-duplicate audit. Task 12 covers migration 016. Tasks 13–15 cover the reception duplicate-phone warning. Tasks 16–17 cover the UI inspection pass. Task 18 is the final verification report.
- **Placeholder scan:** No "TBD" / "TODO" / "fill in details". Task 6 step 1 is intentionally a "read first" step before the payload, because the program-create API contract isn't fully captured here — we read it once before encoding.
- **Type consistency:** Variable names (`createdMemberId`, `createdAuthId`, `createdTemplateId`, `createdAssignmentId`) are used consistently across step functions. `TEST_PHONE` is used as both raw and normalized (already digits-only) — that holds because `normalizePhone("0999000777") === "0999000777"`.
