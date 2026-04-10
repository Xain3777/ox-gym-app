import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import type { CookieMethodsServer } from "@supabase/ssr/dist/main/types";

// ── ENVIRONMENT VARIABLES ─────────────────────────────────────
const supabaseUrl        = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ── BROWSER CLIENT ──────────────────────────────────────────
// Use in Client Components. Handles cookies automatically.
export function createBrowserSupabase() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Legacy export — used in existing client components
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── SERVER CLIENT (with cookies) ────────────────────────────
// Use in Server Components, Server Actions, and Route Handlers.
// Pass cookies from next/headers.
export function createServerClient(cookieStore: CookieMethodsServer) {
  return createSSRServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: cookieStore,
  });
}

// ── SERVICE CLIENT (bypasses RLS) ───────────────────────────
// Use ONLY in API routes, cron jobs, and admin operations.
// Never expose to the browser.
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is not set");
    throw new Error("Database configuration error. Please check environment variables.");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
