// Smoke test the new /api/members POST flow at the DB level.
// Bypasses the HTTP layer (no CSRF / cookies needed) by replicating
// the route's own logic against the service-role client. Cleans up
// after itself.
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const TEST_PHONE = "0998765432";
const TEST_NORM  = "963998765432";
const EMAIL      = `${TEST_NORM}@member.oxgym.app`;
const FULL_NAME  = "Test Member (auto-cleaned)";

async function cleanup() {
  // Delete subscription → member → auth user, in that order
  const { data: m } = await admin.from("members").select("id, auth_id").eq("phone_normalized", TEST_NORM).maybeSingle();
  if (m) {
    await admin.from("subscriptions").delete().eq("member_id", m.id);
    await admin.from("members").delete().eq("id", m.id);
    if (m.auth_id) {
      await admin.auth.admin.deleteUser(m.auth_id).catch(() => {});
    }
  }
  // Also catch any orphan auth user
  for (let page = 1; page < 5; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const u = data.users.find((x) => x.email?.toLowerCase() === EMAIL.toLowerCase());
    if (u) await admin.auth.admin.deleteUser(u.id).catch(() => {});
    if (data.users.length < 200) break;
  }
}

console.log("── Cleaning any prior test data ──");
await cleanup();

console.log("\n── Creating auth user ──");
const { data: authResult, error: authErr } = await admin.auth.admin.createUser({
  email:         EMAIL,
  password:      "TestPass123!",
  email_confirm: true,
  user_metadata: { full_name: FULL_NAME, phone: TEST_NORM },
});
if (authErr) { console.error("✗ auth.create failed:", authErr.message); process.exit(1); }
console.log("✓ auth user:", authResult.user.id);

console.log("\n── Creating member row ──");
const { data: member, error: memErr } = await admin
  .from("members")
  .insert({
    auth_id:            authResult.user.id,
    full_name:          FULL_NAME,
    phone:              TEST_PHONE,
    goals:              "Test goal",
    role:               "player",
    status:             "active",
    temporary_password: "TestPass123!",
  })
  .select()
  .single();
if (memErr) {
  console.error("✗ members.insert failed:", memErr.message);
  await admin.auth.admin.deleteUser(authResult.user.id);
  process.exit(1);
}
console.log("✓ member:", member.id, "phone_normalized:", member.phone_normalized);

console.log("\n── Creating subscription ──");
const today = new Date();
const next  = new Date(); next.setMonth(next.getMonth() + 1);
const { error: subErr } = await admin.from("subscriptions").insert({
  member_id:  member.id,
  plan_type:  "monthly",
  start_date: today.toISOString().slice(0, 10),
  end_date:   next.toISOString().slice(0, 10),
  status:     "active",
  price:      50,
});
if (subErr) {
  console.error("✗ subscriptions.insert failed:", subErr.message);
  await admin.from("members").delete().eq("id", member.id);
  await admin.auth.admin.deleteUser(authResult.user.id);
  process.exit(1);
}
console.log("✓ subscription created");

console.log("\n── Verifying member can be found by phone_normalized ──");
const { data: lookup } = await admin
  .from("members")
  .select("id, full_name, auth_id, phone_normalized, role, status, subscription:subscriptions(plan_type, status, price)")
  .eq("phone_normalized", TEST_NORM)
  .single();
console.log(JSON.stringify(lookup, null, 2));

console.log("\n── Cleaning up test data ──");
await cleanup();
console.log("✓ done");
