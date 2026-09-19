import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import type { Role } from "@/generated/prisma/enums";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { readSessionCookie } from "@/lib/session";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  employeeCode: string;
  phone: string | null;
  role: Role;
  avatarUrl: string | null;
}

export type SessionDenial = "missing" | "inactive" | "stale";

type ResolvedSession =
  | { user: SessionUser; denial: null }
  | { user: null; denial: SessionDenial };

const resolveSession = cache(async (): Promise<ResolvedSession> => {
  const session = await readSessionCookie();
  if (!session) return { user: null, denial: "missing" };

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

  if (!user) return { user: null, denial: "missing" };
  if (user.status !== "ACTIVE") return { user: null, denial: "inactive" };
  if (user.sessionVersion !== session.sv) return { user: null, denial: "stale" };

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      employeeCode: user.employeeCode,
      phone: user.phone,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
    denial: null,
  };
});

export async function getSessionUser(): Promise<SessionUser | null> {
  return (await resolveSession()).user;
}

export async function requireUser(): Promise<SessionUser> {
  const { user, denial } = await resolveSession();
  if (user) return user;

  if (denial === "inactive" || denial === "stale") {
    redirect(`/api/auth/expire?reason=${denial}`);
  }

  redirect("/login");
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/no-access");
  return user;
}

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

export function isAdmin(user: { role: Role } | null | undefined): boolean {
  return user?.role === "ADMIN";
}

export function scopeToUser(
  viewer: SessionUser,
  requestedUserId?: string | null,
): string {
  if (viewer.role === "ADMIN" && requestedUserId) return requestedUserId;
  return viewer.id;
}

export function assertOwnerOrAdmin(
  viewer: SessionUser,
  ownerId: string,
): void {
  if (viewer.role === "ADMIN") return;
  if (viewer.id === ownerId) return;
  throw new ForbiddenError("You can only access your own records.");
}
