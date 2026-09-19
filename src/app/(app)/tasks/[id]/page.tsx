import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { CancelTaskButton } from "@/components/tasks/task-admin-actions";
import { TaskProgressForm } from "@/components/tasks/task-progress-form";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DetailList } from "@/components/ui/detail-list";
import { PageHeader } from "@/components/ui/page-header";
import { assertOwnerOrAdmin, requireUser } from "@/lib/dal";
import { formatDate, formatDateTime, today } from "@/lib/dates";
import { isMailConfigured } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Task",
};

export default async function TaskDetailPage(props: PageProps<"/tasks/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      assignedBy: { select: { name: true } },
      customer: { select: { id: true, name: true, companyName: true } },
    },
  });

  if (!task) notFound();

  assertOwnerOrAdmin(user, task.assigneeId);

  const isAdmin = user.role === "ADMIN";
  const isActive = task.status === "OPEN" || task.status === "IN_PROGRESS";
  const overdue = isActive && task.dueDate !== null && task.dueDate < today();

  const canProgress = isActive && (task.assigneeId === user.id || isAdmin);

  const emailStatus = task.emailedAt
    ? `Emailed to ${task.assignee.email} on ${formatDateTime(task.emailedAt)}`
    : isMailConfigured()
      ? "Email could not be sent — in-app notification delivered"
      : "Email not set up — in-app notification delivered";

  return (
    <>
      <PageHeader
        title={task.title}
        description={
          task.dueDate
            ? `Due ${formatDate(task.dueDate)}${overdue ? " · overdue" : ""}`
            : "No due date"
        }
        breadcrumbs={[{ label: "Tasks", href: "/tasks" }, { label: "Task" }]}
        actions={
          isAdmin && isActive ? (
            <div className="flex flex-wrap gap-2">
              <CancelTaskButton id={task.id} />
              <Button href={`/tasks/${task.id}/edit`} variant="secondary">
                <Pencil aria-hidden="true" />
                Edit
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={task.status} />
        <StatusBadge status={task.priority} dot={false} />
        {overdue && <StatusBadge status="OVERDUE" dot={false} />}
        {task.completedAt && (
          <span className="text-[13px] text-fg-muted">
            Completed {formatDateTime(task.completedAt)}
          </span>
        )}
      </div>

      {task.completionNote && (
        <div className="rounded-xl border border-success/30 bg-success-soft px-4 py-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-success">
            Completion note
          </p>
          <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-fg">
            {task.completionNote}
          </p>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader title="What needs doing" />
            <CardBody>
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-fg">
                {task.description}
              </p>
            </CardBody>
          </Card>

          {canProgress && (
            <TaskProgressForm
              taskId={task.id}
              status={task.status as "OPEN" | "IN_PROGRESS"}
            />
          )}
        </div>

        <Card>
          <CardHeader title="Details" />
          <CardBody>
            <DetailList
              items={[
                { label: "Assigned to", value: task.assignee.name },
                { label: "Assigned by", value: task.assignedBy?.name ?? null },
                { label: "Priority", value: <StatusBadge status={task.priority} dot={false} /> },
                { label: "Due", value: task.dueDate ? formatDate(task.dueDate) : null },
                {
                  label: "Customer",
                  value: task.customer ? (
                    <a
                      href={`/customers/${task.customer.id}`}
                      className="text-accent hover:underline"
                    >
                      {task.customer.companyName ?? task.customer.name}
                    </a>
                  ) : null,
                },
                { label: "Assigned on", value: formatDateTime(task.createdAt) },
                {
                  label: "Started",
                  value: task.startedAt ? formatDateTime(task.startedAt) : null,
                },
                {
                  label: "Completed",
                  value: task.completedAt
                    ? formatDateTime(task.completedAt)
                    : null,
                },
                ...(isAdmin ? [{ label: "Email", value: emailStatus }] : []),
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
