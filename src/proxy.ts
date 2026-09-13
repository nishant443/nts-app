import { NextResponse, type NextRequest } from "next/server";

import { decodeSession, SESSION_COOKIE } from "@/lib/session";

/**
 * Edge-of-app request handling (formerly `middleware.ts`).
 *
 * Two jobs:
 *   1. Security headers on every response.
 *   2. An *optimistic* auth redirect, so a signed-out visitor is bounced to the
 *      login page without the app having to render first.
 *
 * The redirect only reads the signed cookie. It is a convenience, not a
 * security boundary — the real checks live in the Data Access Layer, which
 * re-reads the user from the database on every request. See `lib/dal.ts`.
 */

const PUBLIC_PATHS = new Set(["/login"]);

/** Paths that must stay reachable without a session. */
function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname === "/") return true;
  return false;
}

/**
 * Admin-only routes, matched here so an employee gets a clean redirect instead
 * of a 200 carrying a loading skeleton. Routes with a `loading.tsx` start
 * streaming before the page's own `requireAdmin()` runs, which turns the
 * redirect into a client-side navigation — correct, but it flashes.
 *
 * This list is a convenience and is allowed to drift: every page behind it also
 * calls `requireAdmin()`, which is the actual boundary.
 */
const ADMIN_EXACT = new Set([
  "/reports",
  "/invoices/new",
  "/payments/new",
  "/purchase-orders/new",
  "/settings/company",
  "/settings/holidays",
]);

function isAdminOnly(pathname: string): boolean {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (ADMIN_EXACT.has(pathname)) return true;

  // Editing an existing business document is admin-only; creating is not.
  if (/^\/(customers|invoices|purchase-orders)\/[^/]+\/edit$/.test(pathname)) {
    return true;
  }

  return false;
}

function securityHeaders(response: NextResponse, isDev: boolean): NextResponse {
  const headers = response.headers;

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  headers.set("X-DNS-Prefetch-Control", "off");

  // HSTS only makes sense over https, and would lock out local http development.
  if (!isDev) {
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  // Turbopack's dev overlay and React refresh need eval; production does not.
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'";

  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      // Tailwind emits a style element; next/font injects @font-face rules.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://res.cloudinary.com",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );

  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV === "development";

  // API routes authenticate themselves and must return JSON, not a redirect.
  if (pathname.startsWith("/api/")) {
    return securityHeaders(NextResponse.next(), isDev);
  }

  const session = await decodeSession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  // Signed in and heading for the login page — send them to the dashboard.
  if (session && (pathname === "/login" || pathname === "/")) {
    return securityHeaders(
      NextResponse.redirect(new URL("/dashboard", request.nextUrl)),
      isDev,
    );
  }

  if (!session && !isPublic(pathname)) {
    const loginUrl = new URL("/login", request.nextUrl);
    // Remember where they were headed so login can return them there.
    if (pathname !== "/dashboard") {
      loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    }
    return securityHeaders(NextResponse.redirect(loginUrl), isDev);
  }

  // Optimistic role check — the page still calls `requireAdmin()`.
  if (session && session.role !== "ADMIN" && isAdminOnly(pathname)) {
    return securityHeaders(
      NextResponse.redirect(new URL("/no-access", request.nextUrl)),
      isDev,
    );
  }

  return securityHeaders(NextResponse.next(), isDev);
}

export const config = {
  // Skip Next's own assets and the public brand files; everything else passes
  // through so no page is accidentally left unprotected.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
