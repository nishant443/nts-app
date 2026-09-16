"use server";

import { revalidatePath } from "next/cache";

import { action } from "@/lib/action";
import { prisma } from "@/lib/prisma";

/**
 * Notifications are per-user by construction: every query is filtered by the
 * caller's own id, so one person can never mark another's notifications read.
 *
 * Both actions revalidate the whole layout, not just the list: the unread
 * badge on the bell lives in the app shell and must drop at the same moment.
 */

export const markNotificationRead = action<{ id: string }>(
  { access: "user" },
  async ({ input, user }) => {
    await prisma.notification.updateMany({
      where: { id: input.id, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    revalidatePath("/", "layout");
  },
);

export const markAllNotificationsRead = action<void>(
  { access: "user" },
  async ({ user }) => {
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    revalidatePath("/", "layout");
  },
);
