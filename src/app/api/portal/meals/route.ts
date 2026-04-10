import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// GET — fetch the logged-in user's latest meal plan
export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const service = createServiceClient();

  const { data: member } = await service
    .from("members")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!member) {
    return NextResponse.json({ success: true, data: null });
  }

  const { data: send } = await service
    .from("plan_sends")
    .select("plan_id")
    .eq("member_id", member.id)
    .eq("plan_type", "meal")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(1)
    .single();

  if (!send) {
    return NextResponse.json({ success: true, data: null });
  }

  const { data: plan } = await service
    .from("meal_plans")
    .select("*")
    .eq("id", send.plan_id)
    .single();

  return NextResponse.json({ success: true, data: plan ?? null });
}
