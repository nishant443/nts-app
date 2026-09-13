import type { Metadata } from "next";
import { ListChecks, Plus } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { requireUser } from "@/lib/dal";
import { formatDate, today } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import {
  carryParams,
  enumParam,
  pageWindow,
  param,
  type SearchParams,
} from "@/lib/query";
import { humanizeEnum } from "@/lib/utils";
import { TASK_PRIORITIES } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Tasks",
};

const STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

interface TaskRow {
  id: string;
  title: string;
  assignee: string;
  priority: string;
  status: string;
  dueDate: Date | null;
  overdue: boolean;
  customer: string | null;
}

export default async function TasksPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const searchParams = await props.searchParams;
  const isAdmin = user.role === "ADMIN";

  const term = param(searchParams, "q");
  const status = enumParam(searchParams, "status", STATUSES);
  const priority = enumParam(searchParams, "priority", TASK_PRIORITIES);
  const assigneeFilter = isAdmin ? param(searchParams, "assignee") : undefined;
  const { page, perPage, skip, take } = pageWindow(searchParams);

  // Employees only ever see what is assigned to them. Admins see everything and
  // may narrow to one person.
  const scope = isAdmin
    ? assigneeFilter
      ? { assigneeId: assigneeFilter }
      : {}
    : { assigneeId: user.id };

  const where = {
    ...scope,
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(term
      ? {
          OR: [
            { title: { contains: term, mode: "insensitive" as const } },
            { description: { contains: term, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const now = today();

  const [records, total, openCount, inProgressCount, overdueCount, employees] =
    await Promise.all([
      prisma.task.findMany({
        where,
        // Live work first, most urgent at the top, soonest due before later.
        orderBy: [
          { status: "asc" },
          { priority: "desc" },
          { dueDate: { sort: "asc", nulls: "last" } },
          { createdAt: "desc" },
        ],
        skip,
        take,
        select: {
          id: true,
          title: true,
          priority: true,
          status: true,
          dueDate: true,
          assignee: { select: { name: true } },
          customer: { select: { companyName: true, name: true } },
        },
      }),
      prisma.task.count({ where }),
      prisma.task.count({ where: { ...scope, status: "OPEN" } }),
      prisma.task.count({ where: { ...scope, status: "IN_PROGRESS" } }),
      prisma.task.count({
        where: {
          ...scope,
          status: { in: ["OPEN", "IN_PROGRESS"] },
          dueDate: { lt: now },
        },
      }),
      isAdmin
        ? prisma.user.findMany({
            where: { status: "ACTIVE" },
            orderBy: { name: "asc" },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

  const rows: TaskRow[] = records.map((record) => ({
    id: record.id,
    title: record.title,
    assignee: record.assignee.name,
    priority: record.priority,
    status: record.status,
    dueDate: record.dueDate,
    overdue:
      record.dueDate !== null &&
      record.dueDate < now &&
      (record.status === "OPEN" || record.status === "IN_PROGRESS"),
    customer: record.customer?.companyName ?? record.customer?.name ?? null,
  }));

  const columns: Column<TaskRow>[] = [
    {
      key: "title",
      header: "Task",
      role: "primary",
      cell: (row) => row.title,
    },
    ...(isAdmin
      ? [
          {
            key: "assignee",
            header: "Assigned to",
            mobileLabel: "Assigned to",
            cell: (row: TaskRow) => row.assignee,
          } satisfies Column<TaskRow>,
        ]
      : []),
    {
      key: "customer",
      header: "Customer",
      role: "secondary",
      cell: (row) => (
        <span className="text-fg-muted">
          {row.customer ?? "No customer linked"}
        </span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      mobileLabel: "Priority",
      cell: (row) => <StatusBadge status={row.priority} dot={false} />,
    },
    {
      key: "due",
      header: "Due",
      mobileLabel: "Due",
      cell: (row) =>
        row.dueDate ? (
          <span className={row.overdue ? "tnum font-medium text-danger" : "tnum"}>
            {formatDate(row.dueDate)}
          </span>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      mobileLabel: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Tasks"
        description={
          isAdmin
            ? "Work you have handed to the team, and where each item stands."
            : "Work assigned to you by your administrator."
        }
        actions={
          isAdmin ? (
            <Button href="/tasks/new" variant="primary">
              <Plus aria-hidden="true" />
              Assign task
            </Button>
          ) : undefined
        }
      />

      <StatGrid className="lg:grid-cols-3">
        <StatCard label="Open" value={openCount} tone="accent" />
        <StatCard label="In progress" value={inProgressCount} tone="neutral" />
        <StatCard
          label="Overdue"
          value={overdueCount}
          tone={overdueCount > 0 ? "danger" : "success"}
        />
      </StatGrid>

      <Card>
        <FilterBar
          searchPlaceholder="Search tasks…"
          selects={[
            {
              name: "status",
              label: "Status",
              options: STATUSES.map((value) => ({
                value,
                label: humanizeEnum(value),
              })),
            },
            {
              name: "priority",
              label: "Priorities",
              options: TASK_PRIORITIES.map((value) => ({
                value,
                label: humanizeEnum(value),
              })),
            },
            ...(isAdmin
              ? [
                  {
                    name: "assignee",
                    label: "Assignee",
                    allLabel: "Everyone",
                    options: employees.map((employee) => ({
                      value: employee.id,
                      label: employee.name,
                    })),
                  },
                ]
              : []),
          ]}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          rowHref={(row) => `/tasks/${row.id}`}
          empty={
            <EmptyState
              icon={<ListChecks />}
              title={isAdmin ? "No tasks yet" : "Nothing assigned to you"}
              description={
                isAdmin
                  ? "Assign work to an employee and they will be notified straight away."
                  : "When your administrator assigns you work it will appear here."
              }
              action={
                isAdmin
                  ? { label: "Assign a task", href: "/tasks/new" }
                  : undefined
              }
            />
          }
        />

        <Pagination
          page={page}
          perPage={perPage}
          total={total}
          baseParams={carryParams(searchParams, [
            "q",
            "status",
            "priority",
            "assignee",
          ])}
        />
      </Card>
    </>
  );
}
