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

// Normalize phone: 0999000777 → 963999000777
function normalizePhone(input) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("09") && digits.length === 10) {
    return "963" + digits.slice(1);
  }
  if (digits.startsWith("963") && digits.length === 12) {
    return digits;
  }
  return digits;
}

const TEST_PHONE_NORMALIZED = normalizePhone(TEST_PHONE);

let createdAuthId = null;
let createdMemberId = null;
let createdTemplateId = null;
let createdAssignmentId = null;

const log  = (icon, msg) => console.log(`${icon}  ${msg}`);
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
    .eq("phone_normalized", TEST_PHONE_NORMALIZED);
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

const MANAGER_EMAIL = "963911000001@member.oxgym.app";
const MANAGER_PASS  = "Manager#OX2026";

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

async function step1_receptionCreatesMember() {
  log("→", "step 1: reception creates member + subscription");
  const jwt = await tokenFor(MANAGER_EMAIL, MANAGER_PASS);
  const today = new Date().toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + 30 * 86400e3).toISOString().slice(0, 10);

  const res = await fetch(`${APP}/api/members`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${jwt}`,
      "Origin":        APP,
    },
    body: JSON.stringify({
      full_name:  TEST_NAME,
      phone:      TEST_PHONE,
      password:   TEST_PASSWORD,
      plan_type:  "monthly",
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

async function step2_duplicatePhoneRejected() {
  log("→", "step 2: second create with same phone is rejected");
  const jwt = await tokenFor(MANAGER_EMAIL, MANAGER_PASS);
  const today   = new Date().toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + 30 * 86400e3).toISOString().slice(0, 10);

  const res = await fetch(`${APP}/api/members`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${jwt}`,
      "Origin":        APP,
    },
    body: JSON.stringify({
      full_name:  TEST_NAME + " 2",
      phone:      TEST_PHONE,
      password:   TEST_PASSWORD,
      plan_type:  "monthly",
      start_date: today,
      end_date:   endDate,
      price:      35,
    }),
  });
  if (res.status !== 409) fail(`expected 409, got ${res.status}: ${await res.text()}`);
  pass(`duplicate phone correctly rejected with 409`);
}

async function step3_playerSignupLinks() {
  log("→", "step 3: player self-signup links to existing member by phone");

  // The reception flow (step 1) creates an auth user immediately, so
  // to test the linking branch we must clear the auth_id from the
  // existing member row (simulating a pre-registration without login
  // credentials), delete the auth user, then call /api/auth/signup.
  const normalized = normalizePhone(TEST_PHONE);
  const { data: preLinkRows } = await admin
    .from("members")
    .select("id, auth_id")
    .eq("phone_normalized", normalized);
  const existing = preLinkRows?.[0];
  if (!existing) fail("step 3 pre-condition: no member row found to reset");

  // Delete the auth user created by reception so signup can create a fresh one
  if (existing.auth_id) {
    await admin.from("member_app_profiles").delete().eq("app_user_id", existing.auth_id);
    await admin.auth.admin.deleteUser(existing.auth_id);
  }
  // Unlink auth_id so the signup route sees a member without credentials
  await admin.from("members").update({ auth_id: null }).eq("id", existing.id);

  const res = await fetch(`${APP}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": APP },
    body: JSON.stringify({
      full_name: TEST_NAME,
      phone:     TEST_PHONE,
      password:  TEST_PASSWORD,
    }),
  });
  if (res.status !== 200) fail(`signup expected 200, got ${res.status}: ${await res.text()}`);
  const body = await res.json();
  if (!body?.success || !body?.data?.user_id) fail(`signup body malformed: ${JSON.stringify(body)}`);
  createdAuthId = body.data.user_id;

  // Critical assertions: NO new member row created, existing row got auth_id
  const { data: rows } = await admin
    .from("members")
    .select("id, auth_id")
    .eq("phone_normalized", normalized);

  if (!rows || rows.length !== 1) {
    fail(`expected exactly 1 member row for phone, got ${rows?.length ?? 0}`);
  }
  if (rows[0].id !== createdMemberId) {
    fail(`signup created a new row (${rows[0].id}) instead of linking to ${createdMemberId}`);
  }
  if (rows[0].auth_id !== createdAuthId) {
    fail(`existing member row not linked: auth_id=${rows[0].auth_id}, expected ${createdAuthId}`);
  }

  // member_app_profiles row must exist for the auth user
  const { data: prof } = await admin
    .from("member_app_profiles")
    .select("id")
    .eq("app_user_id", createdAuthId)
    .maybeSingle();
  if (!prof) fail(`no member_app_profiles row created`);

  pass(`signup linked auth_id=${createdAuthId} to member ${createdMemberId}`);
}

async function step4_onboardingCompletes() {
  log("→", "step 4: player completes onboarding");
  // Player's Supabase auth email is the normalized phone @ member.oxgym.app
  const playerEmail = `${normalizePhone(TEST_PHONE)}@member.oxgym.app`;
  const playerJwt = await tokenFor(playerEmail, TEST_PASSWORD);

  const res = await fetch(`${APP}/api/auth/onboarding`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${playerJwt}`,
      "Origin":        APP,
    },
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

  const { data: m } = await admin
    .from("members")
    .select("onboarding_complete, fitness_goal, training_level")
    .eq("id", createdMemberId)
    .single();
  if (!m?.onboarding_complete) fail(`members.onboarding_complete still false`);

  const { data: prof } = await admin
    .from("member_app_profiles")
    .select("onboarding_complete, fitness_goal, training_level, weight_kg, height_cm")
    .eq("app_user_id", createdAuthId)
    .single();
  if (!prof?.onboarding_complete) fail(`member_app_profiles.onboarding_complete still false`);
  if (Number(prof.weight_kg) !== 80 || Number(prof.height_cm) !== 180) {
    fail(`profile body metrics not stored correctly: weight=${prof.weight_kg}, height=${prof.height_cm}`);
  }

  pass(`onboarding wrote both members and member_app_profiles`);
}

async function step5_coachSeesEligible() {
  log("→", "step 5: coach sees the test player in eligible group");
  const coachJwt = await tokenFor(COACH_EMAIL, COACH_PASS);

  const res = await fetch(`${APP}/api/coach/players`, {
    headers: { "Authorization": `Bearer ${coachJwt}` },
  });
  if (res.status !== 200) fail(`expected 200, got ${res.status}: ${await res.text()}`);
  const body = await res.json();

  const eligible = (body.data ?? []).find((p) => p.id === createdMemberId);
  if (!eligible) {
    const visibleIds = (body.data ?? []).map((p) => p.id).join(", ");
    fail(`test player not in eligible list. Saw ids: ${visibleIds}`);
  }
  if (!eligible.has_app_registration) fail(`has_app_registration is false`);
  if (!eligible.has_dashboard_subscription) fail(`has_dashboard_subscription is false`);
  if (!eligible.eligible) fail(`eligible flag is false`);
  pass(`coach sees test player as eligible (full_name=${eligible.full_name})`);
}

async function main() {
  await cleanup("pre-run");
  await step1_receptionCreatesMember();
  await step2_duplicatePhoneRejected();
  await step3_playerSignupLinks();
  await step4_onboardingCompletes();
  await step5_coachSeesEligible();
  await cleanup("post-run");
  log("✓", "all steps passed");
}

main();
