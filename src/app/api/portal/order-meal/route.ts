import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET — return today's orders for the member (so UI state persists across visits)
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });

  const service = createServiceClient();
  const { data: member } = await service.from("members").select("id").eq("auth_id", user.id).single();
  if (!member) return NextResponse.json({ success: true, data: [] });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data } = await service
    .from("meal_orders")
    .select("item_id")
    .eq("member_id", member.id)
    .gte("ordered_at", today.toISOString());

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { item_id, item_name, price, calories } = body;

  if (!item_id || !item_name || price == null || calories == null) {
    return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: member } = await service
    .from("members")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!member) {
    return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
  }

  const { data, error } = await service
    .from("meal_orders")
    .insert({ member_id: member.id, item_id, item_name, price, calories, status: "pending" })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { order_id: data.id } });
}
