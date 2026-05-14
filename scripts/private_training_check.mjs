// Audit private-training groups: list every active coach + their players + billing math.
//
//   node scripts/private_training_check.mjs
//
// Reads gym_subscriptions:
//   - rows with private_group_size > 0 are coaches
//   - rows with private_coach_name set are players in a group
// Grouping key: private_coach_phone (normalized).

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf-8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const today = new Date().toISOString().slice(0, 10);

const { data, error } = await supa
  .from("gym_subscriptions")
  .select(
    "id, member_name, phone, plan_type, start_date, end_date, amount, status, cancelled_at, private_coach_name, private_coach_phone, private_group_size, activation_code",
  )
  .gte("end_date", today)
  .is("cancelled_at", null)
  .order("private_coach_phone", { ascending: true });

if (error) {
  console.error("Query failed:", error.message);
  process.exit(1);
}

const rows = data ?? [];
const coaches = rows.filter((r) => (r.private_group_size ?? 0) > 0);
const players = rows.filter((r) => r.private_coach_name);
const playersByCoachPhone = new Map();
for (const p of players) {
  const key = p.private_coach_phone ?? p.private_coach_name;
  if (!playersByCoachPhone.has(key)) playersByCoachPhone.set(key, []);
  playersByCoachPhone.get(key).push(p);
}

console.log("═══════════════════════════════════════════════════════════════");
console.log(`PRIVATE TRAINING AUDIT — ${today}`);
console.log("═══════════════════════════════════════════════════════════════\n");
console.log(`Active coach subscriptions:  ${coaches.length}`);
console.log(`Active player subscriptions: ${players.length}`);
console.log("");

if (coaches.length === 0 && players.length === 0) {
  console.log("No private-training subscriptions on file.");
  process.exit(0);
}

for (const coach of coaches) {
  const key = coach.phone ?? coach.member_name;
  const group = playersByCoachPhone.get(coach.phone) ?? playersByCoachPhone.get(coach.member_name) ?? [];
  const expectedAmount = 18 + 10 * (coach.private_group_size ?? 0);
  const paid = Number(coach.amount ?? 0);
  const billingOk = paid === expectedAmount;

  console.log(`── Coach: ${coach.member_name}  (${coach.phone ?? "no phone"})`);
  console.log(`   Plan:           ${coach.plan_type ?? "—"}  · ${coach.start_date} → ${coach.end_date}`);
  console.log(`   Group size:     ${coach.private_group_size}`);
  console.log(`   Billed:         $${paid}  ${billingOk ? "✓" : `(expected $${expectedAmount})`}`);
  if (group.length === 0) {
    console.log(`   Players:        (none linked back — check private_coach_phone matches)`);
  } else {
    console.log(`   Players (${group.length}):`);
    for (const p of group) {
      console.log(
        `     · ${p.member_name.padEnd(24)} ${(p.phone ?? "—").padEnd(14)} code=${p.activation_code ?? "—"}  ${p.start_date}→${p.end_date}`,
      );
    }
  }
  console.log("");
}

// Orphan check: any player without a matching coach row
const coachKeys = new Set(coaches.map((c) => c.phone ?? c.member_name));
const orphans = players.filter(
  (p) => !coachKeys.has(p.private_coach_phone) && !coachKeys.has(p.private_coach_name),
);
if (orphans.length > 0) {
  console.log("⚠  Orphan players (no matching coach row):");
  for (const p of orphans) {
    console.log(`     · ${p.member_name} → coach "${p.private_coach_name}" (${p.private_coach_phone ?? "no phone"})`);
  }
}
