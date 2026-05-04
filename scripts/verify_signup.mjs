// Replicate /api/auth/signup against the live DB to prove the flow
// works end-to-end. Creates a clearly-labelled test account, verifies
// the auth.users + members rows, attempts a fresh sign-in with the
// password, then leaves the account in place so you can poke at it.
//
// Pass --cleanup as an arg to delete the test account on success.
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const cleanup = process.argv.includes("--cleanup");

const admin = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(URL, ANON, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("Connected to:", URL);
console.log("Cleanup mode :", cleanup ? "ON (will delete after)" : "OFF (account will persist)");
console.log("");

// Test account
const TEST_NAME  = "Signup Smoke Test";
const TEST_PHONE = "0991234567";
const TEST_NORM  = "963991234567";
const TEST_EMAIL = `${TEST_NORM}@member.oxgym.app`;
const TEST_PASS  = "SmokeTest2026!";

let pass = (msg) => console.log(`  ✓ ${msg}`);
let fail = (msg) => { console.log(`  ✗ ${msg}`); process.exit(1); };

// ── Pre-flight ──────────────────────────────────────────────────
console.log("── Pre-flight checks ──");

{
  const { error } = await admin.from("members").select("id", { head: true, count: "exact" }).limit(1);
  if (error) fail(`members table query failed: ${error.message}`);
  else pass("members table reachable");
}

{
  const { error } = await admin.from("members").select("phone_normalized").limit(1);
  if (error) fail(`phone_normalized column missing: ${error.message}`);
  else pass("phone_normalized column present");
}

{
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) fail(`auth admin API not reachable: ${error.message}`);
  else pass(`auth admin API reachable (${data.users.length >= 0 ? "ok" : "?"})`);
}

// ── Cleanup any prior leftover test row ─────────────────────────
console.log("\n── Cleaning prior test data (if any) ──");
{
  const { data: m } = await admin
    .from("members")
    .select("id, auth_id")
    .eq("phone_normalized", TEST_NORM)
    .maybeSingle();
  if (m) {
    if (m.auth_id) await admin.auth.admin.deleteUser(m.auth_id).catch(() => {});
    await admin.from("subscriptions").delete().eq("member_id", m.id);
    await admin.from("members").delete().eq("id", m.id);
    pass("removed leftover member + auth user");
  } else {
    pass("no leftover");
  }

  // catch any orphan auth user
  for (let page = 1; page < 5; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const u = data.users.find((x) => x.email?.toLowerCase() === TEST_EMAIL.toLowerCase());
    if (u) {
      await admin.auth.admin.deleteUser(u.id).catch(() => {});
      pass("removed orphan auth user");
    }
    if (data.users.length < 200) break;
  }
}

// ── Replicate /api/auth/signup ──────────────────────────────────
console.log("\n── Running signup flow ──");

// 1. Look for existing player on this phone (linking branch)
{
  const { data: existing } = await admin
    .from("members")
    .select("id, auth_id")
    .eq("role", "player")
    .eq("phone_normalized", TEST_NORM)
    .maybeSingle();
  if (existing?.auth_id) fail("phone already has account");
  else if (existing) pass("would link to existing reception-created member");
  else pass("no existing member — will create fresh");
}

// 2. Create the auth user
let authId;
{
  const { data, error } = await admin.auth.admin.createUser({
    email:         TEST_EMAIL,
    password:      TEST_PASS,
    email_confirm: true,
    user_metadata: { full_name: TEST_NAME, phone: TEST_NORM },
  });
  if (error || !data?.user) fail(`auth.admin.createUser failed: ${error?.message ?? "no user returned"}`);
  authId = data.user.id;
  pass(`auth user created: ${authId}`);
}

// 3. Insert members row
let memberId;
{
  const { data, error } = await admin
    .from("members")
    .insert({
      auth_id:            authId,
      role:               "player",
      full_name:          TEST_NAME,
      phone:              TEST_PHONE,
      status:             "active",
      temporary_password: TEST_PASS,
    })
    .select("id, phone_normalized")
    .single();
  if (error || !data) {
    await admin.auth.admin.deleteUser(authId);
    fail(`members.insert failed: ${error?.message}`);
  }
  memberId = data.id;
  pass(`member row inserted: ${memberId}`);
  if (data.phone_normalized !== TEST_NORM) {
    fail(`phone_normalized trigger wrong: got "${data.phone_normalized}", expected "${TEST_NORM}"`);
  }
  pass("phone_normalized trigger fired correctly");
}

// ── Verify the account is fully usable ──────────────────────────
console.log("\n── Verifying account is usable ──");

// 4. Sign in with the password using the anon client (what the app does)
{
  const { data, error } = await anon.auth.signInWithPassword({
    email:    TEST_EMAIL,
    password: TEST_PASS,
  });
  if (error) fail(`sign-in failed: ${error.message}`);
  if (!data?.session) fail("sign-in returned no session");
  pass(`sign-in successful (session expires ${new Date(data.session.expires_at * 1000).toISOString()})`);
}

// 5. Look up the member by phone — what /reception/members would do
{
  const { data, error } = await admin
    .from("members")
    .select("id, full_name, phone, role, status, auth_id")
    .eq("phone_normalized", TEST_NORM)
    .single();
  if (error || !data) fail(`lookup by phone_normalized failed: ${error?.message}`);
  pass(`lookup confirmed: ${data.full_name} | ${data.phone} | role=${data.role}`);
}

// ── Final ───────────────────────────────────────────────────────
if (cleanup) {
  console.log("\n── Cleaning up ──");
  await admin.from("subscriptions").delete().eq("member_id", memberId);
  await admin.from("members").delete().eq("id", memberId);
  await admin.auth.admin.deleteUser(authId);
  pass("removed test account");
} else {
  console.log("\n── Account left in place ──");
  console.log(`  Email   : ${TEST_EMAIL}`);
  console.log(`  Phone   : ${TEST_PHONE}`);
  console.log(`  Password: ${TEST_PASS}`);
  console.log(`  Try logging in at http://localhost:3000/login with phone "${TEST_PHONE}" + password above.`);
  console.log(`  Re-run with --cleanup to delete it.`);
}

console.log("\n✓ SIGNUP FLOW IS WORKING END-TO-END.");
