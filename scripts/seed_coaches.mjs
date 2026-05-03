// ═══════════════════════════════════════════════════════════════
// OX GYM — Coach account seeder (idempotent, additive)
//
// Usage (loads .env.local automatically):
//   node --env-file=.env.local scripts/seed_coaches.mjs
//
// What it does:
//   1. For each of the 11 coaches below, creates or repoints an
//      auth.users row keyed by a synthetic email derived from the
//      synthetic phone (so login works through the existing
//      phone-dropdown staff-login form). The password is set via the
//      Auth Admin API → Supabase bcrypts it into encrypted_password.
//
//   2. Calls the SECURITY DEFINER RPC public.seed_coach_account(...)
//      added in migration 014. The RPC handles the members-side
//      upsert, computes a bcrypt mirror via pgcrypto (members.password_hash),
//      stores the visible plaintext (members.temporary_password), and
//      sets must_change_password = true.
//
// Idempotent: re-running upserts. No duplicates created. Existing
// non-coach staff are left untouched.
//
// Security:
//   - The plaintext password is only written to members.temporary_password
//     for manager/admin reference. Authentication itself happens against
//     auth.users.encrypted_password (bcrypt) via Supabase Auth.
//   - The RPC is granted to service_role only.
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

// ── Coach roster ───────────────────────────────────────────────
// `phone_local` is a synthetic identifier so the existing staff-login
// dropdown (which keys on phone) can find these rows. It is not a real
// number — coaches authenticate by being picked from the dropdown +
// typing their unique OxCoach-XXXXXX password.
//
// To rotate a password, edit `temporary_password` here and re-run.
const COACHES = [
  { username: "mohammad",       full_name: "محمد",       role: "head_coach", phone_local: "0922000001", temporary_password: "OxCoach-482917" },
  { username: "ruaa",           full_name: "رؤى",        role: "coach",      phone_local: "0922000002", temporary_password: "OxCoach-739204" },
  { username: "abd",            full_name: "عبد",        role: "coach",      phone_local: "0922000003", temporary_password: "OxCoach-156830" },
  { username: "ali",            full_name: "علي",        role: "coach",      phone_local: "0922000004", temporary_password: "OxCoach-604281" },
  { username: "abed.saleh",     full_name: "عابد صالح", role: "coach",      phone_local: "0922000005", temporary_password: "OxCoach-928463" },
  { username: "najdat",         full_name: "نجدت",       role: "coach",      phone_local: "0922000006", temporary_password: "OxCoach-371590" },
  { username: "hadeel.mustafa", full_name: "هديل مصطفى", role: "coach",      phone_local: "0922000007", temporary_password: "OxCoach-845126" },
  { username: "thulfiqar",      full_name: "ذوالفقار",   role: "coach",      phone_local: "0922000008", temporary_password: "OxCoach-263748" },
  { username: "maram.makhlouf", full_name: "مرام مخلوف", role: "coach",      phone_local: "0922000009", temporary_password: "OxCoach-590317" },
  { username: "somer.khaddam",  full_name: "سومر خدام",  role: "coach",      phone_local: "0922000010", temporary_password: "OxCoach-714852" },
  { username: "omar.fawz",      full_name: "عمر فوز",    role: "coach",      phone_local: "0922000011", temporary_password: "OxCoach-036491" },
];

const phoneCanonical = (local) => "963" + local.slice(1);
const internalEmail  = (local) => `${phoneCanonical(local)}@member.oxgym.app`;

async function findAuthUserByEmail(email) {
  // listUsers doesn't take an email filter, so we paginate. The roster
  // is small (≤ a few hundred) so this is fine.
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function upsertAuthUser(coach) {
  const email = internalEmail(coach.phone_local);
  const existing = await findAuthUserByEmail(email);

  if (existing) {
    // Re-set password every run so the documented temporary_password is
    // always the actual login password — keeps the seed idempotent.
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password:      coach.temporary_password,
      email_confirm: true,
      user_metadata: { full_name: coach.full_name, username: coach.username },
    });
    if (error) throw new Error(`auth.update ${email}: ${error.message}`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password:      coach.temporary_password,
    email_confirm: true,
    user_metadata: { full_name: coach.full_name, username: coach.username },
  });
  if (error) throw new Error(`auth.create ${email}: ${error.message}`);
  return data.user.id;
}

async function upsertMemberRow(coach, authId) {
  const { data, error } = await admin.rpc("seed_coach_account", {
    p_auth_id:            authId,
    p_username:           coach.username,
    p_full_name:          coach.full_name,
    p_role:               coach.role,
    p_phone:              phoneCanonical(coach.phone_local),
    p_temporary_password: coach.temporary_password,
  });
  if (error) throw new Error(`rpc seed_coach_account ${coach.username}: ${error.message}`);
  return data;
}

async function seedOne(coach) {
  const authId   = await upsertAuthUser(coach);
  const memberId = await upsertMemberRow(coach, authId);
  console.log(`  ✓ ${coach.role.padEnd(11)} ${coach.username.padEnd(18)} ${coach.full_name}  → ${memberId}`);
}

async function main() {
  console.log(`Seeding ${COACHES.length} coach accounts (idempotent)…\n`);
  for (const c of COACHES) {
    await seedOne(c);
  }
  console.log(`\n✓ Done. Coaches log in via /staff-login by selecting their name and entering their OxCoach-XXXXXX password.`);
}

main().catch((e) => { console.error("\n✗", e.message); process.exit(1); });
