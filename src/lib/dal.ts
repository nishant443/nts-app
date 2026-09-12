import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import type { Role } from "@/generated/prisma/enums";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { readSessionCookie } from "@/lib/session";

/**
 * Data Access Layer.
 *
 * Every authorization decision in the app funnels through here. The cookie is
 * only ever a hint: `getSessionUser()` re-reads the user from the database so a
 * deactivated account or a rotated `sessionVersion` takes effect on the very
 * next request rather than whenever the JWT happens to expire.
 *
 * Wrapped in React's `cache` so a page that checks permissions in several
 * components still issues one query per render pass.
 *
 * Naming convention:
 *   require*        — for Server Components; navigates on failure.
 *   requireApi*     — for Route Handlers and Server Actions; throws on failure.
 */

/** The only shape of "current user" the rest of the app ever sees. */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  employeeCode: string;
  phone: string | null;
  role: Role;
  avatarUrl: string | null;
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await readSessionCookie();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      employeeCode: true,
      phone: true,
      role: true,
      avatarUrl: true,
      status: true,
      sessionVersion: true,
    },
  });

  // Deleted, deactivated, or the session was invalidated by a password change.
  if (!user) return null;
  if (user.status !== "ACTIVE") return null;
  if (user.sessionVersion !== session.sv) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    employeeCode: user.employeeCode,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
});

// --- Server Component guards -------------------------------------------------

/** Guarantees a signed-in user, or sends the visitor to the login page. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Guarantees an admin. Employees are sent to an explanatory 403 page rather
 * than bounced to the dashboard, so a shared admin link is understandable.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/no-access");
  return user;
}

// --- Route Handler / Server Action guards ------------------------------------

export async function requireApiUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireApiAdmin(): Promise<SessionUser> {
  const user = await requireApiUser();
  if (user.role !== "ADMIN") {
    throw new ForbiddenError("This action is restricted to administrators.");
  }
  return user;
}

// --- Record-level scoping ----------------------------------------------------

export function isAdmin(user: { role: Role } | null | undefined): boolean {
  return user?.role === "ADMIN";
}

/**
 * Employees may only ever read their own HR records. Returns the id an
 * employee-scoped query should filter on: the requested one for an admin, the
 * caller's own for everybody else.
 *
 * Note this *silently narrows* rather than throwing — an employee hitting
 * `/attendance?userId=someone-else` sees their own attendance, which is the
 * behaviour we want for a shared link.
 */
export function scopeToUser(
  viewer: SessionUser,
  requestedUserId?: string | null,
): string {
  if (viewer.role === "ADMIN" && requestedUserId) return requestedUserId;
  return viewer.id;
}

/** Throws unless the viewer owns the record or is an admin. */
export function assertOwnerOrAdmin(
  viewer: SessionUser,
  ownerId: string,
): void {
  if (viewer.role === "ADMIN") return;
  if (viewer.id === ownerId) return;
  throw new ForbiddenError("You can only access your own records.");
}
