import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
  const { ratings, comments } = body;

  const service = createServiceClient();

  const { data: member } = await service
    .from("members")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!member) {
    return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
  }

  const { error } = await service
    .from("feedback")
    .insert({ member_id: member.id, ratings, comments });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
