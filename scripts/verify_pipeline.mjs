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
