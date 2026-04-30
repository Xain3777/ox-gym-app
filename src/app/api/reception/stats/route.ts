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

  const [{ count: totalMembers }, { count: activeMembers }, { count: expiringMembers }] =
    await Promise.all([
      supabase.from("members").select("*", { count: "exact", head: true }).eq("role", "player"),
      supabase.from("members").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("members").select("*", { count: "exact", head: true }).eq("status", "expiring"),
    ]);

  return NextResponse.json({
    success: true,
    data: {
      totalMembers:        totalMembers ?? 0,
      activeSubscriptions: activeMembers ?? 0,
      expiringSoon:        expiringMembers ?? 0,
    },
  });
}
