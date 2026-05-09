import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ensureMemberAppProfile, upsertMemberAppProfile } from "@/lib/member-app-profile";

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
    medical_notes,
    limitations,
  } = body;

  const supabase = createServiceClient();

  // Support both cookie-based sessions and Bearer token auth
  let userId: string | null = null;
  const authHeader = request.headers.get("authorization") ?? "";
  const bearerMatch = /^Bearer\s+(.+)$/i.exec(authHeader);

  if (bearerMatch) {
    const { data: { user } } = await supabase.auth.getUser(bearerMatch[1]);
    userId = user?.id ?? null;
  } else {
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
    const { data: { user } } = await supabaseAuth.auth.getUser();
    userId = user?.id ?? null;
  }

  if (!userId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id, full_name, phone")
    .eq("auth_id", userId)
    .single();

  if (memberError || !member) {
    return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
  }

  await ensureMemberAppProfile(supabase, userId, member.id);

  const appProfile = await upsertMemberAppProfile(supabase, userId, member.id, {
    full_name: member.full_name,
    phone: member.phone,
    fitness_goal,
    training_level,
    illnesses: illnesses ?? [],
    injuries: injuries ?? [],
    date_of_birth,
    gender,
    weight_kg,
    height_cm,
    medical_notes: medical_notes ?? null,
    limitations: limitations ?? null,
    onboarding_complete: true,
  });

  if (!appProfile) {
    return NextResponse.json({ success: false, error: "Failed to save app profile" }, { status: 500 });
  }

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
    .eq("id", member.id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
