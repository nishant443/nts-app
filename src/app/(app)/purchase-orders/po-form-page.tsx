import { savePurchaseOrder } from "@/app/actions/purchase-orders";
import {
  DocumentForm,
  type DocumentFormValues,
} from "@/components/documents/document-form";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/settings";

/** Shared by the "new" and "edit" purchase-order routes. */
export async function PurchaseOrderFormPage({
  values,
  heading,
  breadcrumbLabel,
}: {
  values: DocumentFormValues;
  heading: string;
  breadcrumbLabel: string;
}) {
  const [vendors, settings] = await Promise.all([
    prisma.customer.findMany({
      where: { type: "VENDOR" },
      orderBy: [{ companyName: "asc" }, { name: "asc" }],
      select: { id: true, name: true, companyName: true, state: true },
    }),
    getCompanySettings(),
  ]);

  return (
    <>
      <PageHeader
        title={heading}
        description="What is being bought, from whom, and when it is expected."
        breadcrumbs={[
          { label: "Purchase orders", href: "/purchase-orders" },
          { label: breadcrumbLabel },
        ]}
      />

      {vendors.length === 0 ? (
        <div className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3.5 text-[13.5px] leading-relaxed text-fg">
          No suppliers on record yet. Add a customer with the relationship set
          to <strong>Vendor / supplier</strong>, then raise the order.
        </div>
      ) : (
        <DocumentForm
          action={savePurchaseOrder}
          values={values}
          homeState={settings.homeState}
          customers={vendors.map((vendor) => ({
            id: vendor.id,
            label: vendor.companyName ?? vendor.name,
            state: vendor.state,
          }))}
          // Purchases are not discounted at document level in NTS's workflow.
          showDiscount={false}
          statuses={[
            { value: "DRAFT", label: "Draft" },
            { value: "SENT", label: "Sent to vendor" },
            { value: "PARTIALLY_RECEIVED", label: "Partially received" },
            { value: "RECEIVED", label: "Received" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
          labels={{
            counterparty: "Vendor",
            counterpartyField: "vendorId",
            secondaryDate: "Expected delivery",
            secondaryDateField: "expectedDate",
            submit: values.id ? "Save changes" : "Create order",
            cancelHref: values.id
              ? `/purchase-orders/${values.id}`
              : "/purchase-orders",
          }}
        />
      )}
    </>
  );
}
