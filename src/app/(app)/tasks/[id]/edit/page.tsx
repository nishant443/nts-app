import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { TaskForm } from "@/components/tasks/task-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/dal";
import { dayKey } from "@/lib/dates";
import { isMailConfigured } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { loadTaskFormOptions } from "@/lib/services/tasks";
import { TASK_PRIORITIES } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Edit task",
};

export default async function EditTaskPage(
  props: PageProps<"/tasks/[id]/edit">,
) {
  await requireAdmin();
  const { id } = await props.params;

  const [task, { employees, customers }] = await Promise.all([
    prisma.task.findUnique({ where: { id } }),
    loadTaskFormOptions(),
  ]);

  if (!task) notFound();

  // Finished work is a record of what happened, not something to rewrite.
  if (task.status === "COMPLETED" || task.status === "CANCELLED") {
    redirect(`/tasks/${task.id}`);
  }

  return (
    <>
      <PageHeader
        title="Edit task"
        description="Changing the assignee notifies and emails the new person."
        breadcrumbs={[
          { label: "Tasks", href: "/tasks" },
          { label: task.title, href: `/tasks/${task.id}` },
          { label: "Edit" },
        ]}
      />

      <TaskForm
        employees={employees}
        customers={customers}
        priorities={TASK_PRIORITIES}
        mailConfigured={isMailConfigured()}
        values={{
          id: task.id,
          title: task.title,
          description: task.description,
          assigneeId: task.assigneeId,
          priority: task.priority,
          dueDate: task.dueDate ? dayKey(task.dueDate) : "",
          customerId: task.customerId ?? "",
        }}
      />
    </>
  );
}
