import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export type UserRole = "player" | "coach" | "reception" | "manager";

export interface AuthContext {
  userId: string;
  memberId: string;
  role: UserRole;
}

/** Build a Supabase client scoped to the request's session cookies. */
async function buildUserClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    },
  );
}

/**
 * Resolve the authenticated user + their DB role.
 * Returns null when the request carries no valid session.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  try {
    const supabase = await buildUserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const service = createServiceClient();
    const { data: member } = await service
      .from("members")
      .select("id, role")
      .eq("auth_id", user.id)
      .single();

    if (!member) return null;

    return { userId: user.id, memberId: member.id, role: member.role as UserRole };
  } catch {
    return null;
  }
}

/** Call at the top of any API route that requires authentication. */
export async function requireAuth(
  allowedRoles?: UserRole[],
): Promise<{ ctx: AuthContext; error: null } | { ctx: null; error: NextResponse }> {
  const ctx = await getAuthContext();

  if (!ctx) {
    return {
      ctx: null,
      error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (allowedRoles && !allowedRoles.includes(ctx.role)) {
    return {
      ctx: null,
      error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ctx, error: null };
}
