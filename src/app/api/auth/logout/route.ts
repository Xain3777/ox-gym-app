import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase";

// POST /api/auth/logout
//
// Browser-only signOut() can leave the Supabase auth cookies behind
// (chunked sb-<ref>-auth-token cookies, mismatched Path/Domain, or
// HttpOnly chunks the browser JS can't touch). When middleware sees
// those leftovers it bounces the user straight back to their role
// home — looking exactly like "the logout button doesn't work".
//
// This route uses the SSR client's cookie methods, so signOut() can
// actually delete every sb-* cookie. The route returns 200 even if
// the upstream Supabase call hiccups — by that point our local cookies
// are gone and middleware will treat the user as anonymous.

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient({
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        for (const { name, value, options } of toSet) {
          cookieStore.set(name, value, options);
        }
      },
    });

    // local scope only — global makes a network call to the auth server
    // and is unnecessary when we just want to drop the session here.
    await supabase.auth.signOut({ scope: "local" });

    // Belt-and-braces: explicitly delete any remaining sb-* cookies in
    // case the SSR helper missed a chunked token.
    for (const c of cookieStore.getAll()) {
      if (c.name.startsWith("sb-")) cookieStore.delete(c.name);
    }
  } catch {
    // Even if signOut threw, fall through — the cookies above are
    // already cleared, which is the only thing the browser cares about.
  }

  return NextResponse.json({ success: true });
}
