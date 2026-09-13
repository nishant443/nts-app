import type { Metadata } from "next";

import { TaskForm } from "@/components/tasks/task-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/dal";
import { isMailConfigured } from "@/lib/mail";
import { loadTaskFormOptions } from "@/lib/services/tasks";
import { TASK_PRIORITIES } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Assign task",
};

export default async function NewTaskPage(props: {
  searchParams: Promise<{ assignee?: string; customer?: string }>;
}) {
  await requireAdmin();
  const searchParams = await props.searchParams;
  const { employees, customers } = await loadTaskFormOptions();

  // Deep links from an employee or customer page can pre-select; anything
  // that is not a real option is ignored rather than trusted.
  const assigneeId =
    employees.find((e) => e.id === searchParams.assignee)?.id ?? "";
  const customerId =
    customers.find((c) => c.id === searchParams.customer)?.id ?? "";

  return (
    <>
      <PageHeader
        title="Assign task"
        description="The employee is notified in the app and by email the moment you save."
        breadcrumbs={[{ label: "Tasks", href: "/tasks" }, { label: "New" }]}
      />

      <TaskForm
        employees={employees}
        customers={customers}
        priorities={TASK_PRIORITIES}
        mailConfigured={isMailConfigured()}
        values={{
          title: "",
          description: "",
          assigneeId,
          priority: "MEDIUM",
          dueDate: "",
          customerId,
        }}
      />
    </>
  );
}
