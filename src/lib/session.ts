import "server-only";

import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

import type { Role } from "@/generated/prisma/enums";
import { env, isProduction } from "@/lib/env";

export const SESSION_COOKIE = "nts_session";

const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const ALGORITHM = "HS256";

const secretKey = new TextEncoder().encode(env.SESSION_SECRET);

/**
 * Claims carried in the session cookie. Deliberately minimal — no email, no
 * phone, nothing that would leak if a token were captured. `role` is present
 * so `proxy.ts` can do a cheap optimistic redirect, but every real
 * authorization decision re-reads the user from the database (see dal.ts).
 */
export interface SessionPayload {
  userId: string;
  role: Role;
  /** Matches `User.sessionVersion`; a bump invalidates tokens already issued. */
  sv: number;
}

export async function encodeSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setSubject(payload.userId)
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey);
}

/** Returns null for any token that is missing, expired, or tampered with. */
export async function decodeSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: [ALGORITHM],
    });

    if (
      typeof payload.userId !== "string" ||
      typeof payload.sv !== "number" ||
      (payload.role !== "ADMIN" && payload.role !== "EMPLOYEE")
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      role: payload.role,
      sv: payload.sv,
    };
  } catch {
    // Expired or invalid — treat as signed out.
    return null;
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    // Allow http on localhost during development; always require https in prod.
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await encodeSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_SECONDS));
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", cookieOptions(0));
}

/** Reads and verifies the cookie without touching the database. */
export async function readSessionCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
}
