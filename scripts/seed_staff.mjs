// Wipes auth.users + seeds the staff roster (1 manager / 5 reception / 10 coach).
// Uses the Auth Admin API via the service-role key, which the Supabase SQL
// Editor can't reach because it doesn't own the `auth` schema.
//
// Usage (loads .env.local automatically):
//   node --env-file=.env.local scripts/seed_staff.mjs

import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPA_URL || !SVC_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

const admin = createClient(SUPA_URL, SVC_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const STAFF = [
  { full_name: "Manager OX",      phone_local: "0911000001", role: "manager",   pwd: "Manager#OX2026" },
  { full_name: "Reception One",   phone_local: "0911000002", role: "reception", pwd: "Reception1#OX2026" },
  { full_name: "Reception Two",   phone_local: "0911000003", role: "reception", pwd: "Reception2#OX2026" },
  { full_name: "Reception Three", phone_local: "0911000004", role: "reception", pwd: "Reception3#OX2026" },
  { full_name: "Reception Four",  phone_local: "0911000005", role: "reception", pwd: "Reception4#OX2026" },
  { full_name: "Reception Five",  phone_local: "0911000006", role: "reception", pwd: "Reception5#OX2026" },
  { full_name: "Coach One",       phone_local: "0911000007", role: "coach",     pwd: "Coach1#OX2026" },
  { full_name: "Coach Two",       phone_local: "0911000008", role: "coach",     pwd: "Coach2#OX2026" },
  { full_name: "Coach Three",     phone_local: "0911000009", role: "coach",     pwd: "Coach3#OX2026" },
  { full_name: "Coach Four",      phone_local: "0911000010", role: "coach",     pwd: "Coach4#OX2026" },
  { full_name: "Coach Five",      phone_local: "0911000011", role: "coach",     pwd: "Coach5#OX2026" },
  { full_name: "Coach Six",       phone_local: "0911000012", role: "coach",     pwd: "Coach6#OX2026" },
  { full_name: "Coach Seven",     phone_local: "0911000013", role: "coach",     pwd: "Coach7#OX2026" },
  { full_name: "Coach Eight",     phone_local: "0911000014", role: "coach",     pwd: "Coach8#OX2026" },
  { full_name: "Coach Nine",      phone_local: "0911000015", role: "coach",     pwd: "Coach9#OX2026" },
  { full_name: "Coach Ten",       phone_local: "0911000016", role: "coach",     pwd: "Coach10#OX2026" },
];

const phoneCanonical = (local) => "963" + local.slice(1);
const internalEmail  = (local) => `${phoneCanonical(local)}@member.oxgym.app`;

async function wipeAllAuthUsers() {
  let removed = 0;
  for (let page = 1; page < 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    if (!data.users.length) break;
    for (const u of data.users) {
      const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
      if (delErr) throw new Error(`delete ${u.email ?? u.id}: ${delErr.message}`);
      removed++;
    }
    if (data.users.length < 200) break;
  }
  console.log(`  wiped ${removed} auth.users`);
}

async function seedOne(s) {
  const email = internalEmail(s.phone_local);

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: s.pwd,
    email_confirm: true,
    user_metadata: { full_name: s.full_name },
  });
  if (createErr) throw new Error(`auth.create ${email}: ${createErr.message}`);

  const authId = created.user.id;
  const { error: insErr } = await admin.from("members").insert({
    auth_id:       authId,
    full_name:     s.full_name,
    username:      s.full_name,
    phone:         phoneCanonical(s.phone_local),
    role:          s.role,
    status:        "active",
    temp_password: s.pwd,
  });
  if (insErr) {
    await admin.auth.admin.deleteUser(authId);
    throw new Error(`members.insert ${s.full_name}: ${insErr.message}`);
  }
  console.log(`  + ${s.role.padEnd(9)} ${s.full_name}`);
}

async function main() {
  console.log("⌫  wiping auth.users …");
  await wipeAllAuthUsers();

  console.log("\n⌫  wiping public.members …");
  const { error: clearErr } = await admin.from("members").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (clearErr) throw new Error(`members.clear: ${clearErr.message}`);

  console.log("\n+  seeding staff:");
  for (const s of STAFF) await seedOne(s);

  console.log(`\n✓  done — ${STAFF.length} staff seeded`);
}

main().catch((e) => { console.error("\n✗", e.message); process.exit(1); });
