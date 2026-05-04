// ═══════════════════════════════════════════════════════════════
// OX GYM — Reception account seeder (idempotent, additive)
//
// Usage:
//   node --env-file=.env.local scripts/seed_reception.mjs
//
// Same shape as scripts/seed_coaches.mjs. Creates 8 reception
// staff in auth.users + members. Authentication via the existing
// /staff-login flow (free-text identifier resolves on phone,
// username, or full_name → email → signInWithPassword).
//
// Idempotent: re-running upserts. Existing rows on the same
// username are repointed; password is re-set every run so the
// printed credentials list is always the source of truth.
//
// Does NOT touch the localStorage `gymData.ts` store or any
// /finance/* page.
// ═══════════════════════════════════════════════════════════════

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

// ── Reception roster ───────────────────────────────────────────
// phone_local 0921xxxxxx is reserved for real reception staff
// (placeholder Reception One–Five sit on 0911xxxx, real coaches
// on 0922xxxx). Login identifier can be any of:
//   - the username (reception_1)
//   - the full_name (استقبال ١)
//   - the phone digits (0921000001 or +9639210000001)
const RECEPTION = [
  { username: "reception_1", full_name: "استقبال ١", phone_local: "0921000001", temporary_password: "OxRecep-318472" },
  { username: "reception_2", full_name: "استقبال ٢", phone_local: "0921000002", temporary_password: "OxRecep-902615" },
  { username: "reception_3", full_name: "استقبال ٣", phone_local: "0921000003", temporary_password: "OxRecep-547108" },
  { username: "reception_4", full_name: "استقبال ٤", phone_local: "0921000004", temporary_password: "OxRecep-263941" },
  { username: "reception_5", full_name: "استقبال ٥", phone_local: "0921000005", temporary_password: "OxRecep-725890" },
  { username: "reception_6", full_name: "استقبال ٦", phone_local: "0921000006", temporary_password: "OxRecep-184367" },
  { username: "reception_7", full_name: "استقبال ٧", phone_local: "0921000007", temporary_password: "OxRecep-639520" },
  { username: "reception_8", full_name: "استقبال ٨", phone_local: "0921000008", temporary_password: "OxRecep-481752" },
];

const phoneCanonical = (local) => "963" + local.slice(1);
const internalEmail  = (local) => `${phoneCanonical(local)}@member.oxgym.app`;

async function findAuthUserByEmail(email) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function upsertAuthUser(staff) {
  const email    = internalEmail(staff.phone_local);
  const existing = await findAuthUserByEmail(email);

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password:      staff.temporary_password,
      email_confirm: true,
      user_metadata: { full_name: staff.full_name, username: staff.username },
    });
    if (error) throw new Error(`auth.update ${email}: ${error.message}`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password:      staff.temporary_password,
    email_confirm: true,
    user_metadata: { full_name: staff.full_name, username: staff.username },
  });
  if (error) throw new Error(`auth.create ${email}: ${error.message}`);
  return data.user.id;
}

async function upsertMemberRow(staff, authId) {
  const phone = phoneCanonical(staff.phone_local);

  const { data: existing } = await admin
    .from("members")
    .select("id")
    .ilike("username", staff.username)
    .maybeSingle();

  if (existing) {
    const { data, error } = await admin
      .from("members")
      .update({
        auth_id:   authId,
        full_name: staff.full_name,
        role:      "reception",
        phone,
      })
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) throw new Error(`members.update ${staff.username}: ${error.message}`);
    return data.id;
  }

  const { data, error } = await admin
    .from("members")
    .insert({
      auth_id:   authId,
      username:  staff.username,
      full_name: staff.full_name,
      role:      "reception",
      phone,
      status:    "active",
    })
    .select("id")
    .single();
  if (error) throw new Error(`members.insert ${staff.username}: ${error.message}`);
  return data.id;
}

async function seedOne(staff) {
  const authId   = await upsertAuthUser(staff);
  const memberId = await upsertMemberRow(staff, authId);
  console.log(`  ✓ ${staff.username.padEnd(14)} ${staff.full_name.padEnd(14)} ${staff.phone_local}  → ${memberId}`);
}

async function main() {
  console.log(`Seeding ${RECEPTION.length} reception accounts (idempotent)…\n`);
  for (const r of RECEPTION) {
    await seedOne(r);
  }
  console.log(`\n✓ Done. Reception logs in via /staff-login.`);
  console.log(`  Identifier accepted: username, full_name (Arabic), or phone digits.`);
}

main().catch((e) => { console.error("\n✗", e.message); process.exit(1); });
