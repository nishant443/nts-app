import type { Metadata } from "next";

import { CustomerForm } from "@/components/customers/customer-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Add customer",
};

export default async function NewCustomerPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const owners = isAdmin
    ? await prisma.user.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  return (
    <>
      <PageHeader
        title="Add customer"
        description="Capture the details you need to quote and invoice."
        breadcrumbs={[
          { label: "Customers", href: "/customers" },
          { label: "Add" },
        ]}
      />

      <CustomerForm
        canAssignOwner={isAdmin}
        owners={owners}
        values={{
          name: "",
          companyName: "",
          type: "LEAD",
          email: "",
          phone: "",
          altPhone: "",
          website: "",
          gstin: "",
          pan: "",
          addressLine1: "",
          addressLine2: "",
          city: "",
          state: "",
          postalCode: "",
          country: "India",
          notes: "",
          ownerId: isAdmin ? "" : user.id,
        }}
      />
    </>
  );
}
