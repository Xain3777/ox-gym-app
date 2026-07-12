import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

// GET /api/reception/stats
// Returns the live counts shown on the reception dashboard. Uses the
// service-role client so the count queries don't depend on RLS scoping
// of whoever is logged in (and because the dashboard is staff-only anyway).
export async function GET(request: Request) {
  const { ctx, error } = await requireAuth(["manager", "reception"], request);
  if (error) return error;
  void ctx;

  const supabase = createServiceClient();

  // Subscription counts come from gym_subscriptions END DATES — the
  // source of truth — not from members.status, which is written once at
  // creation and drifts. The old status-based counts disagreed with the
  // Health page and showed members as "active" after their sub expired.
  const today = new Date().toISOString().slice(0, 10);
  const expiringEdge = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ count: totalMembers }, { count: activeSubs }, { count: expiringSubs }] =
    await Promise.all([
      supabase.from("members").select("*", { count: "exact", head: true }).eq("role", "player"),
      supabase.from("gym_subscriptions").select("*", { count: "exact", head: true })
        .is("cancelled_at", null)
        .gte("end_date", today),
      supabase.from("gym_subscriptions").select("*", { count: "exact", head: true })
        .is("cancelled_at", null)
        .gte("end_date", today)
        .lte("end_date", expiringEdge),
    ]);

  return NextResponse.json({
    success: true,
    data: {
      totalMembers:        totalMembers ?? 0,
      activeSubscriptions: activeSubs ?? 0,
      expiringSoon:        expiringSubs ?? 0,
    },
  });
}
