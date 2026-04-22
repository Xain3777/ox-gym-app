import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ROLE_HOME: Record<string, string> = {
  manager:   "/dashboard",
  coach:     "/coach",
  reception: "/reception",
  player:    "/portal",
};

const PUBLIC_ROUTES = ["/login", "/staff-login", "/signup", "/onboarding", "/api/auth", "/forgot-password", "/reset-password"];
const SKIP_PREFIXES = ["/_next", "/favicon.ico", "/ox-logo.png", "/manifest.json", "/api/"];

function roleForRoute(pathname: string): string | null {
  if (
    pathname.startsWith("/dashboard") || pathname.startsWith("/members") ||
    pathname.startsWith("/plans") || pathname.startsWith("/meal-plans") ||
    pathname.startsWith("/subscriptions") || pathname.startsWith("/reminders") ||
    pathname.startsWith("/notifications") || pathname.startsWith("/settings") ||
    pathname.startsWith("/finance")
  ) return "manager";
  if (pathname.startsWith("/coach")) return "coach";
  if (pathname.startsWith("/reception")) return "reception";
  if (pathname.startsWith("/portal")) return "player";
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
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

    const { data: { user } } = await supabase.auth.getUser();

    // Public routes: redirect authenticated users to their home
    if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
      if (user) {
        const role = await resolveRoleFromDB(supabase, user.id);
        const home = ROLE_HOME[role] ?? "/portal";
        if (!pathname.startsWith(home)) {
          return NextResponse.redirect(new URL(home, request.url));
        }
      }
      return response;
    }

    // Unauthenticated → login
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based route protection (DB-only — no cookie overrides)
    const role = await resolveRoleFromDB(supabase, user.id);
    const routeOwner = roleForRoute(pathname);

    if (routeOwner && routeOwner !== role) {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/portal", request.url));
    }

    return response;
  } catch (error) {
    console.error("Middleware error:", error);
    return response;
  }
}

async function resolveRoleFromDB(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<string> {
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
