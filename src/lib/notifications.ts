import "server-only";

import type { NotificationType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * In-app notifications. Delivery is best-effort — a failure here must not undo
 * the leave approval (or whatever) that triggered it.
 */

interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
      },
    });
  } catch (error) {
    console.error("[notify] failed", input.type, error);
  }
}

/** Fan out to every active admin — used when an employee submits something. */
export async function notifyAdmins(
  input: Omit<NotifyInput, "userId">,
): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", status: "ACTIVE" },
      select: { id: true },
    });

    if (admins.length === 0) return;

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
      })),
    });
  } catch (error) {
    console.error("[notify] admin fan-out failed", input.type, error);
  }
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
