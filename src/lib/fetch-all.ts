// ── Paginated full-table fetch ───────────────────────────────────
//
// PostgREST (Supabase) silently caps a single `.select()` at 1000 rows
// (the db.max_rows / default_limit setting). Any route that reads a whole
// table with one `.select()` therefore goes BLIND to every row past the
// first 1000 — with no error. For gym_subscriptions (>1100 rows) this made
// the newest ~118 subscriptions invisible, so recently-paid/activated
// members vanished from the coach + reception lists even though their data
// was perfectly correct.
//
// fetchAllRows pages past the cap by requesting fixed-size windows with
// `.range()` until a short page signals the end. Pass a FACTORY that
// builds a fresh query each call so `.range()` applies to a clean builder.
//
//   const { data, error } = await fetchAllRows(() =>
//     supabase.from("gym_subscriptions").select("id, ...").is("cancelled_at", null),
//   );

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryFactory = () => any;

export async function fetchAllRows<T = unknown>(
  makeQuery: QueryFactory,
  pageSize = 1000,
): Promise<{ data: T[]; error: unknown }> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1);
    if (error) return { data: out, error };
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return { data: out, error: null };
}
