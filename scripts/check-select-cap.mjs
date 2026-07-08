// ═══════════════════════════════════════════════════════════════
// GUARD: unbounded full-table reads (the 1000-row cap trap)
//
// A plain Supabase `.select()` silently returns at most 1000 rows
// (PostgREST default). Reading a large table with one `.select()` goes
// blind to everything past row 1000 — this hid ~50 paying members from
// the coach + reception pages. This script fails the build/lint if any
// read of a large table isn't bounded (paginated via fetchAllRows, or
// narrowed with .single/.maybeSingle/.limit/.range/.eq/count).
//
// If you have a legitimate reason a read can't exceed 1000 rows, add a
// trailing `// cap-ok: <reason>` comment near the .from() to opt out.
// ═══════════════════════════════════════════════════════════════

import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const BIG_TABLES = ["members", "gym_subscriptions", "member_subscriptions", "member_app_profiles"];
const WRITE_OPS = [".insert(", ".update(", ".delete(", ".upsert("];
// Only these actually bound the row count. NOTE: filters like .eq/.in/.ilike
// do NOT count — .eq("role","player") returns 1100+ rows. A read either
// paginates (fetchAllRows) or limits explicitly, or it's flagged.
const BOUNDERS = [".single(", ".maybeSingle(", ".limit(", ".range(", "count:", "head:"];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if ([".ts", ".tsx"].includes(extname(p))) out.push(p);
  }
  return out;
}

const offenders = [];
const fromRe = new RegExp(`\\.from\\(["'](${BIG_TABLES.join("|")})["']\\)`);

for (const file of walk(ROOT)) {
  if (file.replace(/\\/g, "/").endsWith("src/lib/fetch-all.ts")) continue;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(fromRe);
    if (!m) continue;

    // Wrapped in fetchAllRows? Inline generic type args (each ending in
    // `;`) can push `fetchAllRows(() => supabase.from(...` up to ~18 lines
    // above `.from`, so scan a generous window for the wrapper token.
    let wrapped = false;
    for (let j = i; j >= Math.max(0, i - 20); j--) {
      if (lines[j].includes("fetchAllRows")) { wrapped = true; break; }
    }
    if (wrapped) continue;

    // Forward window: to the end of this statement (next ';').
    let end = i;
    for (let j = i; j < Math.min(lines.length, i + 14); j++) {
      end = j;
      if (lines[j].includes(";")) break;
    }
    const ctx = lines.slice(i, end + 1).join("\n");
    if (WRITE_OPS.some((w) => ctx.includes(w))) continue;      // write, not a read
    if (!ctx.includes(".select(")) continue;                   // not a select read
    if (ctx.includes("cap-ok")) continue;                      // explicit opt-out
    if (BOUNDERS.some((b) => ctx.includes(b))) continue;       // bounded read
    offenders.push(`${file.replace(/\\/g, "/")}:${i + 1}  →  ${lines[i].trim()}`);
  }
}

if (offenders.length) {
  console.error("\n✗ Unbounded full-table read(s) detected — these silently cap at 1000 rows.");
  console.error("  Wrap the query in fetchAllRows(() => ...) from @/lib/fetch-all,");
  console.error("  or narrow it (.eq/.single/.maybeSingle/.limit/.range), or add `// cap-ok: reason`.\n");
  for (const o of offenders) console.error("  " + o);
  console.error("");
  process.exit(1);
}

console.log("✓ No unbounded full-table reads on large tables.");
