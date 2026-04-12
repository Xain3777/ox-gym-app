import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    date_of_birth,
    gender,
    illnesses,
    injuries,
    training_level,
    weight_goal,
    wants_meal_plan,
    takes_supplements,
    takes_preworkout,
  } = body;

  // Get the current user from the session
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  // Use service client to update (bypasses RLS)
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("members")
    .update({
      date_of_birth,
      gender,
      illnesses,
      injuries,
      training_level,
      weight_goal,
      wants_meal_plan,
      takes_supplements,
      takes_preworkout,
      onboarding_complete: true,
    })
    .eq("auth_id", user.id);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
