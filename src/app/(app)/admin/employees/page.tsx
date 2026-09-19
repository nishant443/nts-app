import type { Metadata } from "next";
import { Plus, Users } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Avatar } from "@/components/ui/avatar";
import { requireAdmin } from "@/lib/dal";
import { formatDate } from "@/lib/dates";
import { formatCurrency, toMoney } from "@/lib/money";
import { monthlyGross } from "@/lib/payroll";
import { prisma } from "@/lib/prisma";
import { enumParam, param, type SearchParams } from "@/lib/query";

export const metadata: Metadata = {
  title: "Employees",
};

const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
const ROLES = ["ADMIN", "EMPLOYEE"] as const;

interface EmployeeRow {
  id: string;
  name: string;
  employeeCode: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  avatarUrl: string | null;
  designation: string | null;
  department: string | null;
  dateOfJoining: Date | null;
  monthlySalary: number | null;
}

export default async function EmployeesPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();

  const searchParams = await props.searchParams;
  const term = param(searchParams, "q");
  const status = enumParam(searchParams, "status", STATUSES);
  const role = enumParam(searchParams, "role", ROLES);

  const where = {
    ...(status ? { status } : {}),
    ...(role ? { role } : {}),
    ...(term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" as const } },
            { email: { contains: term, mode: "insensitive" as const } },
            { employeeCode: { contains: term, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const records = await prisma.user.findMany({
    where,
    orderBy: { employeeCode: "asc" },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      avatarUrl: true,
      profile: {
        select: {
          designation: true,
          department: true,
          dateOfJoining: true,
        },
      },
      salaryStructure: {
        orderBy: { effectiveFrom: "desc" },
        take: 1,
        select: {
          basic: true,
          hra: true,
          conveyance: true,
          medical: true,
          specialAllowance: true,
          otherAllowance: true,
        },
      },
    },
  });

  const rows: EmployeeRow[] = records.map((record) => {
    const structure = record.salaryStructure[0];

    return {
      id: record.id,
      name: record.name,
      employeeCode: record.employeeCode,
      email: record.email,
      phone: record.phone,
      role: record.role,
      status: record.status,
      avatarUrl: record.avatarUrl,
      designation: record.profile?.designation ?? null,
      department: record.profile?.department ?? null,
      dateOfJoining: record.profile?.dateOfJoining ?? null,
      monthlySalary: structure
        ? monthlyGross({
            basic: toMoney(structure.basic),
            hra: toMoney(structure.hra),
            conveyance: toMoney(structure.conveyance),
            medical: toMoney(structure.medical),
            specialAllowance: toMoney(structure.specialAllowance),
            otherAllowance: toMoney(structure.otherAllowance),
            pfDeduction: 0,
            esiDeduction: 0,
            professionalTax: 0,
            tdsDeduction: 0,
            otherDeduction: 0,
          })
        : null,
    };
  });

  const columns: Column<EmployeeRow>[] = [
    {
      key: "name",
      header: "Employee",
      role: "primary",
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={row.name} src={row.avatarUrl} size="sm" />
          <span className="truncate">{row.name}</span>
        </span>
      ),
    },
    {
      key: "designation",
      header: "Role",
      role: "secondary",
      cell: (row) => (
        <span className="text-fg-muted">
          {row.employeeCode}
          {row.designation ? ` · ${row.designation}` : ""}
        </span>
      ),
    },
    {
      key: "department",
      header: "Department",
      mobileLabel: "Department",
      hideOnMobile: true,
      cell: (row) => row.department ?? <span className="text-fg-subtle">—</span>,
    },
    {
      key: "contact",
      header: "Contact",
      mobileLabel: "Contact",
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-[12.5px] text-fg-muted">
          {row.phone ?? row.email}
        </span>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      mobileLabel: "Joined",
      cell: (row) => (
        <span className="tnum text-fg-muted">
          {formatDate(row.dateOfJoining)}
        </span>
      ),
    },
    {
      key: "access",
      header: "Access",
      mobileLabel: "Access",
      cell: (row) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={row.role} dot={false} />
          <StatusBadge status={row.status} />
        </span>
      ),
    },
    {
      key: "salary",
      header: "Monthly gross",
      mobileLabel: "Monthly gross",
      align: "right",
      cell: (row) =>
        row.monthlySalary !== null ? (
          <span className="tnum font-medium">
            {formatCurrency(row.monthlySalary)}
          </span>
        ) : (
          <span className="text-[12.5px] text-warning">Not set</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Employees"
        description="Profiles, access levels and salary structures."
        breadcrumbs={[{ label: "Administration" }, { label: "Employees" }]}
        actions={
          <Button href="/admin/employees/new" variant="primary">
            <Plus aria-hidden="true" />
            Add employee
          </Button>
        }
      />

      <Card>
        <FilterBar
          searchPlaceholder="Search name, code or email…"
          selects={[
            {
              name: "role",
              label: "Roles",
              options: [
                { value: "ADMIN", label: "Administrator" },
                { value: "EMPLOYEE", label: "Employee" },
              ],
            },
            {
              name: "status",
              label: "Status",
              options: STATUSES.map((value) => ({
                value,
                label: value.charAt(0) + value.slice(1).toLowerCase(),
              })),
            },
          ]}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          rowHref={(row) => `/admin/employees/${row.id}`}
          empty={
            <EmptyState
              icon={<Users />}
              title="No employees found"
              description="Add your team so they can log work, attendance and expenses."
              action={{ label: "Add employee", href: "/admin/employees/new" }}
            />
          }
        />
      </Card>
    </>
  );
}
