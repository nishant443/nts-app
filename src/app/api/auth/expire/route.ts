import { NextResponse, type NextRequest } from "next/server";

import { destroySession } from "@/lib/session";

/**
 * Clears a session cookie that no longer maps to a usable account — the
 * employee was deactivated, or their password was reset elsewhere — and sends
 * them to the login page with a note explaining why they were signed out.
 *
 * `requireUser()` redirects here; Server Components cannot clear cookies
 * themselves. Deliberately a redirect rather than a page so nothing renders
 * while the cookie is still set.
 */
const NOTICES = new Set(["inactive", "stale"]);

export async function GET(request: NextRequest) {
  await destroySession();

  const reason = request.nextUrl.searchParams.get("reason");
  const login = new URL("/login", request.nextUrl);
  if (reason && NOTICES.has(reason)) login.searchParams.set("notice", reason);

  return NextResponse.redirect(login);
}
