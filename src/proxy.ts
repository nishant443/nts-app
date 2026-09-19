import { NextResponse, type NextRequest } from "next/server";

import { decodeSession, SESSION_COOKIE } from "@/lib/session";

const PUBLIC_PATHS = new Set(["/login"]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname === "/") return true;
  return false;
}

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
    "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  );
  headers.set("X-DNS-Prefetch-Control", "off");

  if (!isDev) {
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'";

  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
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

  if (pathname.startsWith("/api/")) {
    return securityHeaders(NextResponse.next(), isDev);
  }

  const session = await decodeSession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (session && (pathname === "/login" || pathname === "/")) {
    return securityHeaders(
      NextResponse.redirect(new URL("/dashboard", request.nextUrl)),
      isDev,
    );
  }

  if (!session && !isPublic(pathname)) {
    const loginUrl = new URL("/login", request.nextUrl);
    if (pathname !== "/dashboard") {
      loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    }
    return securityHeaders(NextResponse.redirect(loginUrl), isDev);
  }

  if (session && session.role !== "ADMIN" && isAdminOnly(pathname)) {
    return securityHeaders(
      NextResponse.redirect(new URL("/no-access", request.nextUrl)),
      isDev,
    );
  }

  return securityHeaders(NextResponse.next(), isDev);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
