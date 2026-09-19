import { saveInvoice } from "@/app/actions/invoices";
import {
  DocumentForm,
  type DocumentFormValues,
} from "@/components/documents/document-form";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/settings";

export async function InvoiceFormPage({
  values,
  heading,
  breadcrumbLabel,
  quotationId,
}: {
  values: DocumentFormValues;
  heading: string;
  breadcrumbLabel: string;
  quotationId?: string;
}) {
  const [customers, settings] = await Promise.all([
    prisma.customer.findMany({
      where: { type: { not: "VENDOR" } },
      orderBy: [{ companyName: "asc" }, { name: "asc" }],
      select: { id: true, name: true, companyName: true, state: true },
    }),
    getCompanySettings(),
  ]);

  return (
    <>
      <PageHeader
        title={heading}
        description="Line items, GST and payment terms. Totals are calculated on save."
        breadcrumbs={[
          { label: "Invoices", href: "/invoices" },
          { label: breadcrumbLabel },
        ]}
      />

      <DocumentForm
        action={saveInvoice}
        values={values}
        homeState={settings.homeState}
        customers={customers.map((customer) => ({
          id: customer.id,
          label: customer.companyName ?? customer.name,
          state: customer.state,
        }))}
        statuses={[
          { value: "DRAFT", label: "Draft" },
          { value: "SENT", label: "Sent to customer" },
        ]}
        labels={{
          counterparty: "Customer",
          counterpartyField: "customerId",
          secondaryDate: "Due date",
          secondaryDateField: "dueDate",
          secondaryDateHint: "Payment terms are typically 30 days.",
          purchaseOrderRef: true,
          submit: values.id ? "Save changes" : "Create invoice",
          cancelHref: values.id ? `/invoices/${values.id}` : "/invoices",
        }}
        extraHiddenFields={quotationId ? { quotationId } : undefined}
      />
    </>
  );
}
