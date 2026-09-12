import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CustomerForm } from "@/components/customers/customer-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Edit customer",
};

export default async function EditCustomerPage(
  props: PageProps<"/customers/[id]/edit">,
) {
  // Editing an existing customer record is admin-only.
  await requireAdmin();

  const { id } = await props.params;

  const [customer, owners] = await Promise.all([
    prisma.customer.findUnique({ where: { id } }),
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!customer) notFound();

  return (
    <>
      <PageHeader
        title={customer.companyName ?? customer.name}
        description="Update contact, tax and address details."
        breadcrumbs={[
          { label: "Customers", href: "/customers" },
          {
            label: customer.companyName ?? customer.name,
            href: `/customers/${customer.id}`,
          },
          { label: "Edit" },
        ]}
      />

      <CustomerForm
        canAssignOwner
        owners={owners}
        values={{
          id: customer.id,
          name: customer.name,
          companyName: customer.companyName ?? "",
          type: customer.type,
          email: customer.email ?? "",
          phone: customer.phone ?? "",
          altPhone: customer.altPhone ?? "",
          website: customer.website ?? "",
          gstin: customer.gstin ?? "",
          pan: customer.pan ?? "",
          addressLine1: customer.addressLine1 ?? "",
          addressLine2: customer.addressLine2 ?? "",
          city: customer.city ?? "",
          state: customer.state ?? "",
          postalCode: customer.postalCode ?? "",
          country: customer.country,
          notes: customer.notes ?? "",
          ownerId: customer.ownerId ?? "",
        }}
      />
    </>
  );
}
