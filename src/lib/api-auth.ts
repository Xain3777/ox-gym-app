import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export type UserRole = "player" | "coach" | "reception" | "manager";

export interface AuthContext {
  userId: string;
  memberId: string;
  role: UserRole;
}

// ── CSRF: allowed origins ────────────────────────────────────
// Populated from env at module load — no runtime cost.
function getAllowedOrigins(): string[] {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const origins = ["http://localhost:3000", "http://localhost:3001"];
  if (appUrl) origins.push(appUrl.replace(/\/$/, ""));
  return origins;
}

/**
 * Validate that the request Origin matches our app.
 * Only enforced on mutating methods (POST, PUT, PATCH, DELETE).
 * GET requests are read-only and don't need CSRF protection.
 */
export function validateOrigin(request: Request): boolean {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;

  const origin = request.headers.get("origin");
  // Allow server-to-server calls (cron, webhooks) that carry no Origin
  if (!origin) {
    const host = request.headers.get("host") ?? "";
    // Internal calls from same host are fine (no Origin header set by server)
    return true;
  }

  const allowed = getAllowedOrigins();
  return allowed.some((o) => origin.startsWith(o));
}

/** Build a Supabase client scoped to the request's session cookies.
 *
 * setAll must actually write back the refreshed tokens — otherwise the
 * Supabase SDK silently fails to refresh expiring sessions on API calls
 * and the user appears "stuck" after the access token TTL elapses.
 */
async function buildUserClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Calling set from a Server Component throws; safe to ignore
            // because the middleware refresh path will write the cookies.
          }
        },
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

/**
 * Call at the top of any API route that requires authentication.
 * Validates CSRF origin + session + role in one call.
 */
export async function requireAuth(
  allowedRoles?: UserRole[],
  request?: Request,
): Promise<{ ctx: AuthContext; error: null } | { ctx: null; error: NextResponse }> {
  // CSRF check on mutating routes
  if (request && !validateOrigin(request)) {
    return {
      ctx: null,
      error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
    };
  }

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
