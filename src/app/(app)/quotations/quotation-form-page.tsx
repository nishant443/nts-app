import { saveQuotation } from "@/app/actions/quotations";
import {
  DocumentForm,
  type DocumentFormValues,
} from "@/components/documents/document-form";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/settings";

export async function QuotationFormPage({
  values,
  heading,
  breadcrumbLabel,
}: {
  values: DocumentFormValues;
  heading: string;
  breadcrumbLabel: string;
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
        description="Line items, tax and terms. Totals are calculated on save."
        breadcrumbs={[
          { label: "Quotations", href: "/quotations" },
          { label: breadcrumbLabel },
        ]}
      />

      <DocumentForm
        action={saveQuotation}
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
          { value: "ACCEPTED", label: "Accepted" },
          { value: "REJECTED", label: "Rejected" },
          { value: "EXPIRED", label: "Expired" },
        ]}
        labels={{
          counterparty: "Customer",
          counterpartyField: "customerId",
          secondaryDate: "Valid until",
          secondaryDateField: "validUntil",
          secondaryDateHint: "Typically 30 days from the quotation date.",
          submit: values.id ? "Save changes" : "Create quotation",
          cancelHref: values.id ? `/quotations/${values.id}` : "/quotations",
        }}
      />
    </>
  );
}
