// Confirm we're talking to the same DB the SQL Editor wrote to.
// Checks the three things APPLY_NOW.sql is supposed to add, plus
// whether the staff roster has actually been seeded.
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Connected to:", URL);
console.log("Project ref :", URL.match(/https:\/\/([^.]+)/)[1]);
console.log("");

const admin = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1. phone_normalized column?
{
  const { error } = await admin
    .from("members")
    .select("phone_normalized")
    .limit(1);
  console.log(
    "phone_normalized column :",
    error ? `❌ MISSING (${error.message})` : "✅ exists",
  );
}

// 2. head_coach enum value?
{
  const { error } = await admin
    .from("members")
    .select("id")
    .eq("role", "head_coach")
    .limit(1);
  console.log(
    "head_coach enum value   :",
    error ? `❌ MISSING (${error.message})` : "✅ exists",
  );
}

// 3. Staff already seeded?
{
  const { data, error } = await admin
    .from("members")
    .select("username, full_name, role")
    .in("role", ["manager", "reception", "coach", "head_coach"])
    .order("role");
  if (error) {
    console.log("staff roster            : ❌", error.message);
  } else {
    console.log(`staff roster            : ${data.length} rows`);
    data.forEach((m) =>
      console.log(`  · ${m.role.padEnd(11)} ${(m.username || "").padEnd(18)} ${m.full_name}`),
    );
  }
}
