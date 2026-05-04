// Reproduce the exact members.insert from /api/auth/signup against
// whatever DB the env points to. Prints the precise error so we
// know what column is missing or what constraint is violated.
//
// Usage:
//   node --env-file=.env.local                                  scripts/diagnose_signup.mjs
//   node --env-file=.env.local.backup-fbfzdebvqkgvsppeuitg      scripts/diagnose_signup.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("Targeting:", URL);
console.log("");

const PHONE = "0998888888";
const NORM  = "963998888888";
const EMAIL = `${NORM}@member.oxgym.app`;

// Cleanup any prior probe
async function cleanup() {
  try {
    const { data: rows } = await admin.from("members").select("id, auth_id").eq("phone", PHONE);
    for (const r of rows ?? []) {
      if (r.auth_id) await admin.auth.admin.deleteUser(r.auth_id).catch(() => {});
      await admin.from("members").delete().eq("id", r.id);
    }
  } catch {}
  for (let p = 1; p < 5; p++) {
    const { data } = await admin.auth.admin.listUsers({ page: p, perPage: 200 });
    const u = data.users.find((x) => x.email?.toLowerCase() === EMAIL.toLowerCase());
    if (u) await admin.auth.admin.deleteUser(u.id).catch(() => {});
    if (data.users.length < 200) break;
  }
}

console.log("── Cleanup any prior test data ──");
await cleanup();
console.log("  done\n");

console.log("── Step A: list which columns exist on public.members ──");
{
  // Probe known columns one-by-one to discover which exist.
  const probe = ["id", "auth_id", "username", "full_name", "phone", "phone_normalized", "role", "status", "goals", "temporary_password", "temp_password", "password_hash", "must_change_password", "created_at"];
  const present = [];
  const missing = [];
  for (const col of probe) {
    const { error } = await admin.from("members").select(col).limit(1);
    if (error) missing.push(col);
    else present.push(col);
  }
  console.log("  PRESENT:", present.join(", "));
  console.log("  MISSING:", missing.join(", ") || "(none)");
}

console.log("\n── Step B: create auth user (mirroring the route) ──");
const { data: authResult, error: authErr } = await admin.auth.admin.createUser({
  email:         EMAIL,
  password:      "ProbePass!23",
  email_confirm: true,
  user_metadata: { full_name: "Probe", phone: NORM },
});
if (authErr) {
  console.log("  ✗ FAILED:", authErr.message);
  process.exit(1);
}
console.log("  ✓ auth user:", authResult.user.id);

console.log("\n── Step C: members.insert (the line the error comes from) ──");
const { data: ins, error: insErr } = await admin
  .from("members")
  .insert({
    auth_id:            authResult.user.id,
    role:               "player",
    full_name:          "Probe",
    phone:              PHONE,
    status:             "active",
    temporary_password: "ProbePass!23",
  })
  .select("id, phone_normalized")
  .single();

if (insErr) {
  console.log("  ✗ FAILED:");
  console.log("     code   :", insErr.code);
  console.log("     message:", insErr.message);
  console.log("     details:", insErr.details);
  console.log("     hint   :", insErr.hint);
  console.log("\n  →  THIS IS THE ROOT CAUSE OF 'تعذّر إنشاء الملف الشخصي'.");
  console.log("  Cleaning up auth user…");
  await admin.auth.admin.deleteUser(authResult.user.id);
  process.exit(1);
}

console.log("  ✓ INSERT succeeded:", ins.id, "phone_normalized=", ins.phone_normalized);
console.log("\n  → If this insert works against this DB but the API still fails,");
console.log("    then the API is hitting a DIFFERENT DB than the one this script targets.");

console.log("\n── Cleanup ──");
await admin.from("members").delete().eq("id", ins.id);
await admin.auth.admin.deleteUser(authResult.user.id);
console.log("  done");
