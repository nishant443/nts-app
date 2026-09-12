"use server";

import { revalidatePath } from "next/cache";

import { action } from "@/lib/action";
import { prisma } from "@/lib/prisma";

/**
 * Notifications are per-user by construction: every query is filtered by the
 * caller's own id, so one person can never mark another's notifications read.
 */

export const markNotificationRead = action<{ id: string }>(
  { access: "user" },
  async ({ input, user }) => {
    await prisma.notification.updateMany({
      where: { id: input.id, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    revalidatePath("/notifications");
  },
);

export const markAllNotificationsRead = action<void>(
  { access: "user" },
  async ({ user }) => {
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    revalidatePath("/notifications");
  },
);
