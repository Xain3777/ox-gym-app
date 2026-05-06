// Exhaustive search for the "100 subscribers" the user mentioned.
// Probes every plausible table name, counts auth users, dumps any
// non-staff member rows. Run against both projects (current env +
// the backup env file) to be sure.
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("Connected to:", URL);
console.log("");

// ── Every plausible table name ──────────────────────────────────
const TABLE_GUESSES = [
  // current schema
  "members", "subscriptions", "workout_plans", "meal_plans", "plan_sends",
  "notifications", "workout_logs", "audit_logs",
  // possible legacy / alternative names
  "subscribers", "customers", "registrations", "users", "people", "clients",
  "memberships", "subscription_records", "renewals", "payments", "transactions",
  "sales", "checkins", "check_ins", "attendance", "visits", "leads",
  "inbody_sessions", "store_items", "store_sales", "salaries", "expenses",
  "offers", "plans", "pricing", "discounts",
];

console.log("── Probing every plausible table name ──");
const FOUND = [];
for (const t of TABLE_GUESSES) {
  const { count, error } = await admin
    .from(t)
    .select("*", { count: "exact", head: true });
  if (!error) {
    FOUND.push({ table: t, count: count ?? 0 });
    console.log(`  ${t.padEnd(22)} ${(count ?? 0).toString().padStart(6)} rows`);
  }
}

// ── members breakdown ───────────────────────────────────────────
console.log("\n── members.role breakdown ──");
{
  const { data } = await admin.from("members").select("role, status, auth_id, created_at");
  const counts = {};
  for (const m of data ?? []) {
    const k = `${m.role} (auth_id=${m.auth_id ? "yes" : "no"})`;
    counts[k] = (counts[k] ?? 0) + 1;
  }
  console.log(counts);
}

// ── any non-staff members? ──────────────────────────────────────
console.log("\n── non-staff members (player or null role) ──");
{
  const { data } = await admin
    .from("members")
    .select("id, full_name, phone, role, auth_id, created_at")
    .or("role.eq.player,role.is.null")
    .limit(105);
  console.log(`Total: ${data?.length ?? 0}`);
  (data ?? []).slice(0, 5).forEach((m) =>
    console.log(`  · ${m.full_name} | ${m.phone} | role=${m.role} | auth=${m.auth_id ? "yes" : "no"} | ${m.created_at?.slice(0, 10)}`),
  );
  if ((data?.length ?? 0) > 5) console.log(`  ... and ${data.length - 5} more`);
}

// ── auth users count ────────────────────────────────────────────
console.log("\n── auth.users total ──");
{
  let total = 0;
  for (let page = 1; page < 50; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    total += data.users.length;
    if (data.users.length < 200) break;
  }
  console.log(`  ${total} auth users total`);
}

// ── audit log clues ─────────────────────────────────────────────
console.log("\n── recent audit_logs (clues about activity) ──");
{
  const { data, error } = await admin
    .from("audit_logs")
    .select("action, target_type, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) console.log(`  audit_logs: ${error.message}`);
  else if ((data ?? []).length === 0) console.log("  (no audit log entries)");
  else (data ?? []).forEach((a) =>
    console.log(`  · ${a.created_at?.slice(0, 16)} | ${a.action} | ${a.target_type}`),
  );
}

// ── subscriptions check ─────────────────────────────────────────
console.log("\n── subscriptions detail ──");
{
  const { data } = await admin.from("subscriptions").select("id, member_id, plan_type, status, created_at");
  console.log(`  ${data?.length ?? 0} subscriptions`);
}
