import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download, FileCheck2, Pencil } from "lucide-react";

import {
  convertQuotationToInvoice,
  setQuotationStatus,
} from "@/app/actions/quotations";
import { ConfirmAction } from "@/components/documents/confirm-action";
import { DocumentView } from "@/components/documents/document-view";
import { EmailDocumentButton } from "@/components/documents/email-button";
import { StatusActions } from "@/components/documents/status-actions";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/dal";
import { formatDate } from "@/lib/dates";
import { isMailConfigured } from "@/lib/mail";
import { toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/settings";

export async function generateMetadata(
  props: PageProps<"/quotations/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    select: { number: true },
  });
  return { title: quotation?.number ?? "Quotation" };
}

export default async function QuotationDetailPage(
  props: PageProps<"/quotations/[id]">,
) {
  const user = await requireUser();
  const { id } = await props.params;

  const [quotation, settings] = await Promise.all([
    prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { name: true } },
        items: { orderBy: { position: "asc" } },
        invoices: { select: { id: true, number: true } },
      },
    }),
    getCompanySettings(),
  ]);

  if (!quotation) notFound();

  const isAdmin = user.role === "ADMIN";
  const locked = quotation.status === "CONVERTED";

  return (
    <>
      <PageHeader
        title={quotation.number}
        description={`${quotation.customer.companyName ?? quotation.customer.name} · ${formatDate(quotation.date)}`}
        breadcrumbs={[
          { label: "Quotations", href: "/quotations" },
          { label: quotation.number },
        ]}
        actions={
          <>
            <Button href={`/api/pdf/quotation/${quotation.id}`} variant="secondary">
              <Download aria-hidden="true" />
              PDF
            </Button>

            {isAdmin && (
              <EmailDocumentButton
                kind="quotation"
                id={quotation.id}
                customerEmail={quotation.customer.email}
                customerName={
                  quotation.customer.companyName ?? quotation.customer.name
                }
                configured={isMailConfigured()}
              />
            )}

            {!locked && (
              <Button href={`/quotations/${quotation.id}/edit`} variant="secondary">
                <Pencil aria-hidden="true" />
                Edit
              </Button>
            )}

            {isAdmin && !locked && quotation.status === "ACCEPTED" && (
              <ConfirmAction
                action={convertQuotationToInvoice}
                input={{ id: quotation.id }}
                title="Convert to invoice?"
                body="A draft invoice will be created with these line items, and this quotation will be locked."
                confirmLabel="Create invoice"
                trigger={
                  <>
                    <FileCheck2 aria-hidden="true" />
                    Convert to invoice
                  </>
                }
                variant="primary"
              />
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <StatusBadge status={quotation.status} />

        {!locked ? (
          <StatusActions
            id={quotation.id}
            current={quotation.status}
            onChange={setQuotationStatus}
            options={[
              { value: "DRAFT", label: "Draft" },
              { value: "SENT", label: "Sent" },
              { value: "ACCEPTED", label: "Accepted" },
              { value: "REJECTED", label: "Rejected" },
              { value: "EXPIRED", label: "Expired" },
            ]}
          />
        ) : (
          <p className="text-[13px] text-fg-muted">
            Converted to{" "}
            {quotation.invoices.map((invoice) => (
              <a
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="font-medium text-accent hover:underline"
              >
                {invoice.number}
              </a>
            ))}
          </p>
        )}

        {quotation.validUntil && (
          <span className="text-[13px] text-fg-muted">
            Valid until{" "}
            <span className="text-fg">{formatDate(quotation.validUntil)}</span>
          </span>
        )}

        <span className="text-[13px] text-fg-muted">
          Raised by <span className="text-fg">{quotation.createdBy.name}</span>
        </span>
      </div>

      {quotation.subject && (
        <p className="text-[15px] font-medium text-fg">{quotation.subject}</p>
      )}

      <DocumentView
        party={quotation.customer}
        partyLabel="Quotation for"
        settings={settings}
        notes={quotation.notes}
        terms={quotation.terms}
        placeOfSupply={quotation.placeOfSupply}
        lines={quotation.items.map((item) => ({
          id: item.id,
          description: item.description,
          hsnCode: item.hsnCode,
          quantity: toMoney(item.quantity),
          unit: item.unit,
          unitPrice: toMoney(item.unitPrice),
          taxRate: toMoney(item.taxRate),
          lineTotal: toMoney(item.lineTotal),
        }))}
        totals={{
          subtotal: toMoney(quotation.subtotal),
          discountAmount: toMoney(quotation.discountAmount),
          taxableAmount: toMoney(quotation.taxableAmount),
          cgstAmount: toMoney(quotation.cgstAmount),
          sgstAmount: toMoney(quotation.sgstAmount),
          igstAmount: toMoney(quotation.igstAmount),
          total: toMoney(quotation.total),
        }}
      />
    </>
  );
}
