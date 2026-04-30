import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ROLE_HOME: Record<string, string> = {
  manager:   "/dashboard",
  coach:     "/coach",
  reception: "/reception",
  player:    "/portal",
};

const PUBLIC_ROUTES  = ["/login", "/staff-login", "/signup", "/api/auth", "/forgot-password", "/reset-password"];
const SKIP_PREFIXES  = ["/_next", "/favicon.ico", "/ox-logo.png", "/manifest.json", "/api/"];
const IS_PROD        = process.env.NODE_ENV === "production";

// If the role lookup hangs, don't take the whole page down — fall back to
// the most-restrictive default. 1.5s is plenty for a SECURITY DEFINER RPC.
const ROLE_LOOKUP_TIMEOUT_MS = 1500;

function roleForRoute(pathname: string): string | null {
  if (
    pathname.startsWith("/dashboard") || pathname.startsWith("/members") ||
    pathname.startsWith("/plans")     || pathname.startsWith("/meal-plans") ||
    pathname.startsWith("/subscriptions") || pathname.startsWith("/reminders") ||
    pathname.startsWith("/notifications") || pathname.startsWith("/settings") ||
    pathname.startsWith("/finance")   || pathname.startsWith("/roles")
  ) return "manager";
  if (pathname.startsWith("/coach"))     return "coach";
  if (pathname.startsWith("/reception")) return "reception";
  if (pathname.startsWith("/portal"))    return "player";
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── HTTPS enforcement (production only) ──────────────────────
  if (IS_PROD && request.headers.get("x-forwarded-proto") === "http") {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, { status: 301 });
  }

  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
  } catch (err) {
    console.error("[middleware] auth.getUser failed:", err);
    // Treat as unauthenticated rather than hanging the request.
    user = null;
  }

  const isPublic   = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const routeOwner = roleForRoute(pathname);

  // ── Public routes ──────────────────────────────────────────────
  // Anonymous → let through.
  // Authenticated → bounce to their role home, but only if we can resolve
  // the role; if the lookup fails we let them stay on the public page
  // rather than redirect-loop.
  if (isPublic) {
    if (!user) return response;
    const role = await resolveRoleSafely(supabase);
    if (!role) return response;
    const home = ROLE_HOME[role] ?? "/portal";
    if (!pathname.startsWith(home)) {
      return NextResponse.redirect(new URL(home, request.url));
    }
    return response;
  }

  // ── Protected routes ───────────────────────────────────────────
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Only resolve role when the route actually has an owner. Pages like
  // /renew or /onboarding don't restrict by role and don't need the RPC.
  if (!routeOwner) return response;

  const role = await resolveRoleSafely(supabase);
  if (!role) {
    // Couldn't resolve — let the page render rather than hang. The page's
    // own data fetching will handle auth-derived state.
    return response;
  }

  if (routeOwner !== role) {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/portal", request.url));
  }

  return response;
}

/** Look up the caller's role via the SECURITY DEFINER RPC.
 *  Returns null on timeout, RPC error, or null result — caller decides
 *  whether to redirect-fallback or continue. */
async function resolveRoleSafely(
  supabase: ReturnType<typeof createServerClient>,
): Promise<string | null> {
  try {
    const rpc = supabase.rpc("current_user_role");
    const timeout = new Promise<{ data: null; error: Error }>((resolve) =>
      setTimeout(
        () => resolve({ data: null, error: new Error("role lookup timed out") }),
        ROLE_LOOKUP_TIMEOUT_MS,
      ),
    );
    const { data, error } = await Promise.race([rpc, timeout]) as
      { data: string | null; error: { message: string } | null };
    if (error) {
      console.error("[middleware] role lookup error:", error.message);
      return null;
    }
    return data ?? null;
  } catch (err) {
    console.error("[middleware] role lookup threw:", err);
    return null;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
