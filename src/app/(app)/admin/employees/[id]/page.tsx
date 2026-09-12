import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmployeeEditForm } from "@/components/employees/employee-edit-form";
import { ResetPasswordButton } from "@/components/employees/reset-password-button";
import { SalaryStructureForm } from "@/components/employees/salary-structure-form";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/dal";
import { dayKey, formatDate, monthRange, today } from "@/lib/dates";
import { formatCurrency, toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(
  props: PageProps<"/admin/employees/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const employee = await prisma.user.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: employee?.name ?? "Employee" };
}

export default async function EmployeeDetailPage(
  props: PageProps<"/admin/employees/[id]">,
) {
  await requireAdmin();
  const { id } = await props.params;

  const now = today();
  const thisMonth = monthRange(now.getUTCMonth() + 1, now.getUTCFullYear());

  const [employee, structures, attendanceThisMonth, pendingCounts] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id },
        include: { profile: true },
      }),
      prisma.salaryStructure.findMany({
        where: { userId: id },
        orderBy: { effectiveFrom: "desc" },
        take: 6,
      }),
      prisma.attendance.groupBy({
        by: ["status"],
        where: { userId: id, date: { gte: thisMonth.from, lte: thisMonth.to } },
        _count: true,
      }),
      prisma.$transaction([
        prisma.leaveRequest.count({ where: { userId: id, status: "PENDING" } }),
        prisma.dailyWorkLog.count({ where: { userId: id, status: "SUBMITTED" } }),
        prisma.expense.count({ where: { userId: id, status: "PENDING" } }),
      ]),
    ]);

  if (!employee) notFound();

  const current = structures[0];
  const counts = Object.fromEntries(
    attendanceThisMonth.map((row) => [row.status, row._count]),
  );

  const profile = employee.profile;

  return (
    <>
      <PageHeader
        title={employee.name}
        description={`${employee.employeeCode}${profile?.designation ? ` · ${profile.designation}` : ""}`}
        breadcrumbs={[
          { label: "Employees", href: "/admin/employees" },
          { label: employee.name },
        ]}
        actions={
          <ResetPasswordButton
            employeeId={employee.id}
            employeeName={employee.name}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={employee.name} src={employee.avatarUrl} size="lg" />
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={employee.role} dot={false} />
          <StatusBadge status={employee.status} />
          {employee.lastLoginAt && (
            <span className="text-[13px] text-fg-muted">
              Last signed in {formatDate(employee.lastLoginAt)}
            </span>
          )}
        </div>
      </div>

      <StatGrid>
        <StatCard
          label="Present this month"
          value={counts.PRESENT ?? 0}
          tone="success"
          href="/admin/attendance"
        />
        <StatCard
          label="Leave requests"
          value={pendingCounts[0]}
          tone={pendingCounts[0] > 0 ? "warning" : "neutral"}
          hint="Pending"
          href="/admin/approvals?tab=leave"
        />
        <StatCard
          label="Work reports"
          value={pendingCounts[1]}
          tone={pendingCounts[1] > 0 ? "warning" : "neutral"}
          hint="Awaiting review"
          href="/admin/approvals?tab=work"
        />
        <StatCard
          label="Expense claims"
          value={pendingCounts[2]}
          tone={pendingCounts[2] > 0 ? "warning" : "neutral"}
          hint="Pending"
          href="/admin/approvals?tab=expenses"
        />
      </StatGrid>

      <EmployeeEditForm
        values={{
          id: employee.id,
          name: employee.name,
          email: employee.email,
          phone: employee.phone ?? "",
          role: employee.role,
          status: employee.status,
          designation: profile?.designation ?? "",
          department: profile?.department ?? "",
          employmentType: profile?.employmentType ?? "FULL_TIME",
          dateOfJoining: profile?.dateOfJoining
            ? dayKey(profile.dateOfJoining)
            : "",
          dateOfBirth: profile?.dateOfBirth ? dayKey(profile.dateOfBirth) : "",
          gender: profile?.gender ?? "",
          bloodGroup: profile?.bloodGroup ?? "",
          addressLine1: profile?.addressLine1 ?? "",
          addressLine2: profile?.addressLine2 ?? "",
          city: profile?.city ?? "",
          state: profile?.state ?? "",
          postalCode: profile?.postalCode ?? "",
          emergencyContactName: profile?.emergencyContactName ?? "",
          emergencyContactPhone: profile?.emergencyContactPhone ?? "",
          panNumber: profile?.panNumber ?? "",
          aadhaarNumber: profile?.aadhaarNumber ?? "",
          uanNumber: profile?.uanNumber ?? "",
          bankName: profile?.bankName ?? "",
          bankAccountNo: profile?.bankAccountNo ?? "",
          bankIfsc: profile?.bankIfsc ?? "",
          bankHolderName: profile?.bankHolderName ?? "",
        }}
      />

      <SalaryStructureForm
        userId={employee.id}
        values={{
          effectiveFrom: current
            ? dayKey(current.effectiveFrom)
            : dayKey(thisMonth.from),
          basic: String(toMoney(current?.basic)),
          hra: String(toMoney(current?.hra)),
          conveyance: String(toMoney(current?.conveyance)),
          medical: String(toMoney(current?.medical)),
          specialAllowance: String(toMoney(current?.specialAllowance)),
          otherAllowance: String(toMoney(current?.otherAllowance)),
          pfDeduction: String(toMoney(current?.pfDeduction)),
          esiDeduction: String(toMoney(current?.esiDeduction)),
          professionalTax: String(toMoney(current?.professionalTax)),
          tdsDeduction: String(toMoney(current?.tdsDeduction)),
          otherDeduction: String(toMoney(current?.otherDeduction)),
          notes: current?.notes ?? "",
        }}
      />

      {structures.length > 1 && (
        <Card>
          <CardHeader
            title="Salary history"
            description="Earlier structures, newest first."
          />
          <ul className="divide-y divide-border">
            {structures.slice(1).map((structure) => (
              <li
                key={structure.id}
                className="flex items-center gap-3 px-4 py-3 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-fg">
                    From {formatDate(structure.effectiveFrom)}
                  </p>
                  {structure.notes && (
                    <p className="truncate text-[12px] text-fg-muted">
                      {structure.notes}
                    </p>
                  )}
                </div>
                <p className="tnum shrink-0 text-[13.5px] font-semibold text-fg">
                  {formatCurrency(
                    toMoney(structure.basic) +
                      toMoney(structure.hra) +
                      toMoney(structure.conveyance) +
                      toMoney(structure.medical) +
                      toMoney(structure.specialAllowance) +
                      toMoney(structure.otherAllowance),
                  )}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
