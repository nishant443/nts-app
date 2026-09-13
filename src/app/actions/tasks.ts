"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { action, formAction, formError, formSuccess } from "@/lib/action";
import { recordAudit } from "@/lib/audit";
import { formatDate, formatDateTime, parseDateInput } from "@/lib/dates";
import { env } from "@/lib/env";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { flash } from "@/lib/flash";
import { isMailConfigured, sendMail, taskAssignedEmail, taskCompletedEmail } from "@/lib/mail";
import { notify, notifyAdmins } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/settings";
import { humanizeEnum } from "@/lib/utils";
import { taskProgressSchema, taskSchema } from "@/lib/validation";

/**
 * Tasks an administrator assigns to employees.
 *
 * Assignment reaches the employee two ways: an in-app notification, which
 * always goes out, and an email carrying the full description, which is
 * best-effort — the task is saved whether or not SMTP is configured, and
 * `emailedAt` records whether the mail actually left so the task page can say.
 */

const ACTIVE_STATUSES = ["OPEN", "IN_PROGRESS"] as const;

async function assertAssignable(userId: string): Promise<{ name: string; email: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, status: true },
  });

  if (!user) throw new NotFoundError("That employee no longer exists.");
  if (user.status !== "ACTIVE") {
    throw new ConflictError("Tasks can only be assigned to active employees.");
  }

  return user;
}

/**
 * Delivers the assignment email. Returns the send time, or null when mail is
 * not set up or the send failed — either way the caller carries on.
 */
async function emailAssignment(options: {
  task: {
    id: string;
    title: string;
    description: string;
    priority: string;
    dueDate: Date | null;
    customer: { name: string; companyName: string | null } | null;
  };
  assignee: { name: string; email: string };
  assignedBy: string;
  reassigned: boolean;
}): Promise<Date | null> {
  if (!isMailConfigured()) return null;

  try {
    const settings = await getCompanySettings();

    const { subject, text, html } = taskAssignedEmail({
      assigneeName: options.assignee.name,
      title: options.task.title,
      description: options.task.description,
      priority: humanizeEnum(options.task.priority),
      dueDate: options.task.dueDate ? formatDate(options.task.dueDate) : null,
      customer:
        options.task.customer?.companyName ?? options.task.customer?.name ?? null,
      assignedBy: options.assignedBy,
      companyName: settings.name,
      link: `${env.NEXT_PUBLIC_APP_URL}/tasks/${options.task.id}`,
      reassigned: options.reassigned,
    });

    await sendMail({ to: options.assignee.email, subject, text, html });
    return new Date();
  } catch (error) {
    // Already logged by sendMail; the notification has gone out regardless.
    console.error("[tasks] assignment email failed", options.task.id, error);
    return null;
  }
}

export const saveTask = formAction(
  { access: "admin", schema: taskSchema },
  async ({ input, user }) => {
    const assignee = await assertAssignable(input.assigneeId);
    const dueDate = input.dueDate ? parseDateInput(input.dueDate) : null;

    if (input.id) {
      const existing = await prisma.task.findUnique({
        where: { id: input.id },
        select: { id: true, assigneeId: true, status: true },
      });

      if (!existing) throw new NotFoundError("That task no longer exists.");

      if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
        return formError(
          `A ${existing.status.toLowerCase()} task can no longer be edited.`,
        );
      }

      const reassigned = existing.assigneeId !== input.assigneeId;

      const updated = await prisma.task.update({
        where: { id: input.id },
        data: {
          title: input.title,
          description: input.description,
          priority: input.priority,
          dueDate,
          assigneeId: input.assigneeId,
          customerId: input.customerId ?? null,
          // A reassigned task starts over for its new owner.
          ...(reassigned
            ? { status: "OPEN", startedAt: null, emailedAt: null }
            : {}),
        },
        select: {
          id: true,
          title: true,
          description: true,
          priority: true,
          dueDate: true,
          customer: { select: { name: true, companyName: true } },
        },
      });

      if (reassigned) {
        await notify({
          userId: input.assigneeId,
          type: "TASK_ASSIGNED",
          title: `${user.name} assigned you a task`,
          body: input.title,
          link: `/tasks/${updated.id}`,
        });

        const emailedAt = await emailAssignment({
          task: updated,
          assignee,
          assignedBy: user.name,
          reassigned: true,
        });
        if (emailedAt) {
          await prisma.task.update({
            where: { id: updated.id },
            data: { emailedAt },
          });
        }
      } else {
        await notify({
          userId: input.assigneeId,
          type: "TASK_UPDATED",
          title: "A task assigned to you was updated",
          body: input.title,
          link: `/tasks/${updated.id}`,
        });
      }

      await recordAudit({
        userId: user.id,
        action: reassigned ? "task.reassigned" : "task.updated",
        entity: "Task",
        entityId: updated.id,
        meta: { assignee: assignee.name },
      });

      revalidatePath("/tasks");
      revalidatePath(`/tasks/${updated.id}`);
      revalidatePath("/dashboard");
      await flash("Task updated.");
      redirect(`/tasks/${updated.id}`);
    }

    const created = await prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueDate,
        assigneeId: input.assigneeId,
        assignedById: user.id,
        customerId: input.customerId ?? null,
        status: "OPEN",
      },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        dueDate: true,
        customer: { select: { name: true, companyName: true } },
      },
    });

    await notify({
      userId: input.assigneeId,
      type: "TASK_ASSIGNED",
      title: `${user.name} assigned you a task`,
      body: input.title,
      link: `/tasks/${created.id}`,
    });

    const emailedAt = await emailAssignment({
      task: created,
      assignee,
      assignedBy: user.name,
      reassigned: false,
    });
    if (emailedAt) {
      await prisma.task.update({
        where: { id: created.id },
        data: { emailedAt },
      });
    }

    await recordAudit({
      userId: user.id,
      action: "task.created",
      entity: "Task",
      entityId: created.id,
      meta: {
        assignee: assignee.name,
        priority: input.priority,
        emailed: Boolean(emailedAt),
      },
    });

    revalidatePath("/tasks");
    revalidatePath("/dashboard");

    await flash(`Task assigned to ${assignee.name}.`);
    redirect(`/tasks/${created.id}`);
  },
);

async function emailCompletion(options: {
  task: {
    id: string;
    title: string;
    customer: { name: string; companyName: string | null } | null;
  };
  recipient: { name: string; email: string };
  completedBy: string;
  note: string | null;
  completedAt: Date;
}): Promise<void> {
  if (!isMailConfigured()) return;

  try {
    const settings = await getCompanySettings();
    const { subject, text, html } = taskCompletedEmail({
      recipientName: options.recipient.name,
      completedBy: options.completedBy,
      title: options.task.title,
      note: options.note,
      completedAt: formatDateTime(options.completedAt),
      customer:
        options.task.customer?.companyName ?? options.task.customer?.name ?? null,
      companyName: settings.name,
      link: `${env.NEXT_PUBLIC_APP_URL}/tasks/${options.task.id}`,
    });
    await sendMail({ to: options.recipient.email, subject, text, html });
  } catch (error) {
    // The in-app notification has already gone out; email is best effort.
    console.error("[tasks] completion email failed", options.task.id, error);
  }
}

/** The assignee starts or finishes their task. Admins may do it on their behalf. */
export const progressTask = formAction(
  { access: "user", schema: taskProgressSchema },
  async ({ input, user }) => {
    const task = await prisma.task.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        title: true,
        status: true,
        assigneeId: true,
        assignedById: true,
        assignedBy: { select: { name: true, email: true } },
        customer: { select: { name: true, companyName: true } },
      },
    });

    if (!task) throw new NotFoundError("That task no longer exists.");

    if (task.assigneeId !== user.id && user.role !== "ADMIN") {
      return formError("Only the person the task is assigned to can update it.");
    }

    if (!ACTIVE_STATUSES.includes(task.status as (typeof ACTIVE_STATUSES)[number])) {
      return formError(
        `This task is ${task.status.toLowerCase()} and cannot be changed.`,
      );
    }

    if (input.status === "IN_PROGRESS" && task.status !== "OPEN") {
      return formError("This task has already been started.");
    }

    const now = new Date();

    await prisma.task.update({
      where: { id: task.id },
      data:
        input.status === "IN_PROGRESS"
          ? { status: "IN_PROGRESS", startedAt: now }
          : {
              status: "COMPLETED",
              completedAt: now,
              // Completing straight from OPEN still counts as having started.
              startedAt: task.status === "OPEN" ? now : undefined,
              completionNote: input.note ?? null,
            },
    });

    if (input.status === "COMPLETED") {
      const notification = {
        type: "TASK_COMPLETED" as const,
        title: `${user.name} completed a task`,
        body: input.note ?? task.title,
        link: `/tasks/${task.id}`,
      };

      // Tell whoever assigned it — in the app and by email — and fall back to
      // every admin if they are gone.
      if (task.assignedById && task.assignedById !== user.id) {
        await notify({ userId: task.assignedById, ...notification });
        if (task.assignedBy) {
          await emailCompletion({
            task,
            recipient: task.assignedBy,
            completedBy: user.name,
            note: input.note ?? null,
            completedAt: now,
          });
        }
      } else if (!task.assignedById) {
        await notifyAdmins(notification);
      }
    }

    await recordAudit({
      userId: user.id,
      action: input.status === "COMPLETED" ? "task.completed" : "task.started",
      entity: "Task",
      entityId: task.id,
    });

    revalidatePath("/tasks");
    revalidatePath(`/tasks/${task.id}`);
    revalidatePath("/dashboard");

    return formSuccess(
      input.status === "COMPLETED" ? "Task marked complete." : "Task started.",
    );
  },
);

export const cancelTask = action<{ id: string }>(
  { access: "admin" },
  async ({ input, user }) => {
    const task = await prisma.task.findUnique({
      where: { id: input.id },
      select: { id: true, title: true, status: true, assigneeId: true },
    });

    if (!task) throw new NotFoundError("That task no longer exists.");

    if (task.status === "COMPLETED" || task.status === "CANCELLED") {
      throw new ConflictError(
        `A ${task.status.toLowerCase()} task cannot be cancelled.`,
      );
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { status: "CANCELLED" },
    });

    await notify({
      userId: task.assigneeId,
      type: "TASK_CANCELLED",
      title: "A task assigned to you was cancelled",
      body: task.title,
      link: `/tasks/${task.id}`,
    });

    await recordAudit({
      userId: user.id,
      action: "task.cancelled",
      entity: "Task",
      entityId: task.id,
    });

    revalidatePath("/tasks");
    revalidatePath(`/tasks/${task.id}`);
    revalidatePath("/dashboard");
  },
);
