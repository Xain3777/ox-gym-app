import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    fitness_goal,
    training_level,
    illnesses,
    injuries,
    date_of_birth,
    gender,
    weight_kg,
    height_cm,
  } = body;

  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch { /* Server Component context — ignore */ }
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("members")
    .update({
      fitness_goal,
      training_level,
      illnesses,
      injuries,
      date_of_birth,
      gender,
      weight_kg,
      height_cm,
      onboarding_complete: true,
    })
    .eq("auth_id", user.id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
