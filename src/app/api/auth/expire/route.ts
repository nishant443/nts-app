import { NextResponse, type NextRequest } from "next/server";

import { destroySession } from "@/lib/session";

const NOTICES = new Set(["inactive", "stale"]);

export async function GET(request: NextRequest) {
  await destroySession();

  const reason = request.nextUrl.searchParams.get("reason");
  const login = new URL("/login", request.nextUrl);
  if (reason && NOTICES.has(reason)) login.searchParams.set("notice", reason);

  return NextResponse.redirect(login);
}
