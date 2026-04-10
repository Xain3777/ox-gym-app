import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// GET — fetch the logged-in user's member profile + subscription
export async function GET() {
  // Get the authenticated user from cookies
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // read-only in GET route handlers
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  // Use service client to bypass RLS
  const service = createServiceClient();

  const { data: member, error } = await service
    .from("members")
    .select("*, subscription:subscriptions(*)")
    .eq("auth_id", user.id)
    .single();

  if (error || !member) {
    return NextResponse.json({ success: false, error: error?.message ?? "Member not found" }, { status: 404 });
  }

  // Flatten subscription
  const sub = Array.isArray(member.subscription) ? member.subscription[0] ?? null : member.subscription;

  return NextResponse.json({
    success: true,
    data: { ...member, subscription: sub },
  });
}
