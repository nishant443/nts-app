import "server-only";

import type { NotificationType } from "@/generated/prisma/enums";
import { env } from "@/lib/env";
import { isMailConfigured, notificationEmail, sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/settings";

interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  email?: boolean;
}

const CATEGORY: Record<NotificationType, string> = {
  LEAVE_SUBMITTED: "Leave request",
  LEAVE_APPROVED: "Leave approved",
  LEAVE_REJECTED: "Leave not approved",
  WORKLOG_SUBMITTED: "Work report",
  WORKLOG_APPROVED: "Work report approved",
  WORKLOG_REJECTED: "Work report returned",
  EXPENSE_SUBMITTED: "Expense claim",
  EXPENSE_APPROVED: "Expense approved",
  EXPENSE_REJECTED: "Expense not approved",
  PAYSLIP_READY: "Payslip",
  PAYMENT_RECEIVED: "Payment received",
  PAYMENT_OVERDUE: "Payment overdue",
  QUOTATION_ACCEPTED: "Quotation accepted",
  TASK_ASSIGNED: "Task assigned",
  TASK_UPDATED: "Task updated",
  TASK_COMPLETED: "Task completed",
  TASK_CANCELLED: "Task cancelled",
  WORK_LOCATION_SET: "Work location",
  GENERAL: "Notification",
};

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

  if (input.email !== false) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { name: true, email: true, status: true },
    });
    if (user && user.status === "ACTIVE") await emailNotification(user, input);
  }
}

export async function notifyAdmins(
  input: Omit<NotifyInput, "userId">,
): Promise<void> {
  let admins: { id: string; name: string; email: string }[] = [];
  try {
    admins = await prisma.user.findMany({
      where: { role: "ADMIN", status: "ACTIVE" },
      select: { id: true, name: true, email: true },
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

  if (input.email !== false) {
    for (const admin of admins) await emailNotification(admin, input);
  }
}

async function emailNotification(
  recipient: { name: string; email: string },
  input: Omit<NotifyInput, "userId">,
): Promise<void> {
  if (!isMailConfigured()) return;

  try {
    const settings = await getCompanySettings();
    const { subject, text, html } = notificationEmail({
      recipientName: recipient.name,
      category: CATEGORY[input.type],
      title: input.title,
      body: input.body ?? null,
      link: input.link ? `${env.NEXT_PUBLIC_APP_URL}${input.link}` : null,
      companyName: settings.name,
    });
    await sendMail({ to: recipient.email, subject, text, html });
  } catch (error) {
    console.error("[notify] email failed", input.type, error);
  }
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
