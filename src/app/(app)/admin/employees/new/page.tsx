import type { Metadata } from "next";

import { EmployeeCreateForm } from "@/components/employees/employee-create-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/dal";
import { dayKey, today } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Add employee",
};

export default async function NewEmployeePage() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="Add employee"
        description="Create an account, then set their salary structure on the next screen."
        breadcrumbs={[
          { label: "Employees", href: "/admin/employees" },
          { label: "Add" },
        ]}
      />

      <EmployeeCreateForm defaultDate={dayKey(today())} />
    </>
  );
}
