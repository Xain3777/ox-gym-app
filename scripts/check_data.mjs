// Inventory the project the env points to.
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

console.log("Connected to:", process.env.NEXT_PUBLIC_SUPABASE_URL);

console.log("\n── members count by role ──");
{
  const { data } = await admin.from("members").select("role");
  const counts = {};
  (data ?? []).forEach((m) => { counts[m.role] = (counts[m.role] ?? 0) + 1; });
  console.log(counts);
}

console.log("\n── all player members (most recent first) ──");
{
  const { data } = await admin
    .from("members")
    .select("id, full_name, phone, role, auth_id, created_at")
    .eq("role", "player")
    .order("created_at", { ascending: false });
  console.log(`Total players: ${data?.length ?? 0}`);
  (data ?? []).forEach((m) =>
    console.log(`  · ${(m.full_name || "(no name)").padEnd(25)} | ${(m.phone || "—").padEnd(15)} | ${m.created_at?.slice(0, 16)}`),
  );
}
