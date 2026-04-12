import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ── ROLE → HOME ROUTE MAP ────────────────────────────────────
const ROLE_HOME: Record<string, string> = {
  manager:   "/dashboard",
  coach:     "/coach",
  reception: "/reception",
  player:    "/portal",
};

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/signup", "/onboarding", "/api/auth"];

// Routes that should be skipped entirely
const SKIP_PREFIXES = ["/_next", "/favicon.ico", "/ox-logo.png", "/manifest.json", "/api/"];

// Which role owns which route prefix
function roleForRoute(pathname: string): string | null {
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/members") ||
      pathname.startsWith("/plans") || pathname.startsWith("/meal-plans") ||
      pathname.startsWith("/subscriptions") || pathname.startsWith("/reminders") ||
      pathname.startsWith("/notifications") || pathname.startsWith("/settings")) {
    return "manager";
  }
  if (pathname.startsWith("/coach"))     return "coach";
  if (pathname.startsWith("/reception")) return "reception";
  if (pathname.startsWith("/portal"))    return "player";
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and API routes
  if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase environment variables are not configured");
      return response;
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    // Refresh session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // ── PUBLIC ROUTES ────────────────────────────────────────
    if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
      if (user) {
        const role = await resolveRole(supabase, user.id, request);
        const home = ROLE_HOME[role] ?? "/portal";
        if (!pathname.startsWith(home)) {
          return NextResponse.redirect(new URL(home, request.url));
        }
      }
      return response;
    }

    // No session → login
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // ── ROLE-BASED ROUTE PROTECTION ──────────────────────────
    const role = await resolveRole(supabase, user.id, request);
    const routeOwner = roleForRoute(pathname);

    // If the route belongs to a different role, redirect to user's home
    if (routeOwner && routeOwner !== role) {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/portal", request.url));
    }

    return response;
  } catch (error) {
    console.error("Middleware error:", error);
    return response;
  }
}

// Resolve role: test-role cookie (dev) or DB
async function resolveRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  request: NextRequest,
): Promise<string> {
  // Dev override via cookie
  const testRole = request.cookies.get("test-role")?.value;
  if (testRole && ["player", "coach", "reception", "manager"].includes(testRole)) {
    return testRole;
  }

  // DB lookup
  const { data: member } = await supabase
    .from("members")
    .select("role")
    .eq("auth_id", userId)
    .single();

  return member?.role ?? "player";
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
