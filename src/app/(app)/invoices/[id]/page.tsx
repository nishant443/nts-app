import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";

import { deleteInvoice, setInvoiceStatus } from "@/app/actions/invoices";
import { ConfirmAction } from "@/components/documents/confirm-action";
import { DocumentView } from "@/components/documents/document-view";
import { EmailDocumentButton } from "@/components/documents/email-button";
import { StatusActions } from "@/components/documents/status-actions";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { requireUser } from "@/lib/dal";
import { formatDate, today } from "@/lib/dates";
import { isMailConfigured } from "@/lib/mail";
import { formatCurrency, round2, toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/settings";

export async function generateMetadata(
  props: PageProps<"/invoices/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: { number: true },
  });
  return { title: invoice?.number ?? "Invoice" };
}

export default async function InvoiceDetailPage(
  props: PageProps<"/invoices/[id]">,
) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const { id } = await props.params;

  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { name: true } },
        quotation: { select: { id: true, number: true } },
        items: { orderBy: { position: "asc" } },
        payments: {
          orderBy: { date: "desc" },
          select: {
            id: true,
            date: true,
            amount: true,
            mode: true,
            status: true,
            reference: true,
          },
        },
      },
    }),
    getCompanySettings(),
  ]);

  if (!invoice) notFound();

  const total = toMoney(invoice.total);
  const paid = toMoney(invoice.amountPaid);
  const balance = round2(total - paid);
  const overdue = Boolean(
    invoice.dueDate && invoice.dueDate < today() && balance > 0.009,
  );

  return (
    <>
      <PageHeader
        title={invoice.number}
        description={`${invoice.customer.companyName ?? invoice.customer.name} · ${formatDate(invoice.date)}`}
        breadcrumbs={[
          { label: "Invoices", href: "/invoices" },
          { label: invoice.number },
        ]}
        actions={
          <>
            <Button href={`/api/pdf/invoice/${invoice.id}`} variant="secondary">
              <Download aria-hidden="true" />
              PDF
            </Button>

            {isAdmin && (
              <>
                <EmailDocumentButton
                  kind="invoice"
                  id={invoice.id}
                  customerEmail={invoice.customer.email}
                  customerName={
                    invoice.customer.companyName ?? invoice.customer.name
                  }
                  configured={isMailConfigured()}
                />

                {balance > 0.009 && invoice.status !== "CANCELLED" && (
                  <Button
                    href={`/payments/new?invoiceId=${invoice.id}`}
                    variant="primary"
                  >
                    <Plus aria-hidden="true" />
                    Record payment
                  </Button>
                )}

                <Button href={`/invoices/${invoice.id}/edit`} variant="secondary">
                  <Pencil aria-hidden="true" />
                  Edit
                </Button>

                {invoice.status === "DRAFT" &&
                  invoice.payments.length === 0 && (
                    <ConfirmAction
                      action={deleteInvoice}
                      input={{ id: invoice.id }}
                      title="Delete this draft?"
                      body="The invoice and its line items will be removed. This cannot be undone."
                      confirmLabel="Delete"
                      variant="danger"
                      successMessage="Invoice deleted."
                      redirectTo="/invoices"
                      trigger={
                        <>
                          <Trash2 aria-hidden="true" />
                          Delete
                        </>
                      }
                    />
                  )}
              </>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <StatusBadge status={invoice.status} />

        {isAdmin && (
          <StatusActions
            id={invoice.id}
            current={invoice.status}
            onChange={setInvoiceStatus}
            options={[
              { value: "DRAFT", label: "Draft" },
              { value: "SENT", label: "Sent" },
              { value: "CANCELLED", label: "Cancelled" },
            ]}
          />
        )}

        {invoice.quotation && (
          <span className="text-[13px] text-fg-muted">
            From quotation{" "}
            <a
              href={`/quotations/${invoice.quotation.id}`}
              className="font-medium text-accent hover:underline"
            >
              {invoice.quotation.number}
            </a>
          </span>
        )}

        <span className="text-[13px] text-fg-muted">
          Raised by <span className="text-fg">{invoice.createdBy.name}</span>
        </span>
      </div>

      <StatGrid className="lg:grid-cols-3">
        <StatCard label="Invoice total" value={formatCurrency(total)} tone="accent" />
        <StatCard
          label="Received"
          value={formatCurrency(paid)}
          tone={paid > 0 ? "success" : "neutral"}
          hint={`${invoice.payments.length} payment(s)`}
        />
        <StatCard
          label="Balance due"
          value={formatCurrency(balance)}
          tone={balance > 0.009 ? (overdue ? "danger" : "warning") : "success"}
          hint={
            balance <= 0.009
              ? "Fully settled"
              : invoice.dueDate
                ? overdue
                  ? `Overdue since ${formatDate(invoice.dueDate)}`
                  : `Due ${formatDate(invoice.dueDate)}`
                : undefined
          }
        />
      </StatGrid>

      {invoice.subject && (
        <p className="text-[15px] font-medium text-fg">{invoice.subject}</p>
      )}

      <DocumentView
        party={invoice.customer}
        partyLabel="Bill to"
        settings={settings}
        notes={invoice.notes}
        terms={invoice.terms}
        placeOfSupply={invoice.placeOfSupply}
        lines={invoice.items.map((item) => ({
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
          subtotal: toMoney(invoice.subtotal),
          discountAmount: toMoney(invoice.discountAmount),
          taxableAmount: toMoney(invoice.taxableAmount),
          cgstAmount: toMoney(invoice.cgstAmount),
          sgstAmount: toMoney(invoice.sgstAmount),
          igstAmount: toMoney(invoice.igstAmount),
          total,
        }}
      />

      {invoice.payments.length > 0 && (
        <Card>
          <CardHeader title="Payments against this invoice" />
          <ul className="divide-y divide-border">
            {invoice.payments.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center gap-3 px-4 py-3 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-fg">
                    {formatDate(payment.date)}
                  </p>
                  <p className="truncate text-[12px] text-fg-muted">
                    {payment.mode}
                    {payment.reference ? ` · ${payment.reference}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tnum text-[13.5px] font-semibold text-success">
                    {formatCurrency(payment.amount)}
                  </p>
                  <StatusBadge status={payment.status} dot={false} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
