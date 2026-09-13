import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

/** Paths that require a signed-in user. */
const PROTECTED_PREFIXES = ["/learn", "/exam", "/admin", "/profile"];

/**
 * Refreshes the Supabase auth session cookie on every request and
 * redirects anonymous users away from protected routes.
 * Called from src/proxy.ts.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not add logic between createServerClient and getClaims():
  // it can cause the session to be dropped.
  // getClaims() verifies the JWT locally against the project's JWKS (ES256),
  // so this is not a network round trip on every request; it still refreshes
  // an expired session via the refresh token when needed.
  const { data } = await supabase.auth.getClaims();
  const hasUser = Boolean(data?.claims?.sub);

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!hasUser && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
