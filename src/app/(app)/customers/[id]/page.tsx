import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  FileText,
  Mail,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Wallet2,
} from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DetailList } from "@/components/ui/detail-list";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { requireUser } from "@/lib/dal";
import { formatDate } from "@/lib/dates";
import { formatCurrency, round2, toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { formatAddress } from "@/lib/settings";

export async function generateMetadata(
  props: PageProps<"/customers/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: { name: true, companyName: true },
  });

  return { title: customer?.companyName ?? customer?.name ?? "Customer" };
}

export default async function CustomerDetailPage(
  props: PageProps<"/customers/[id]">,
) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const { id } = await props.params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true } },
      createdBy: { select: { name: true } },
      quotations: {
        orderBy: { date: "desc" },
        take: 8,
        select: {
          id: true,
          number: true,
          date: true,
          status: true,
          total: true,
        },
      },
      invoices: {
        orderBy: { date: "desc" },
        select: {
          id: true,
          number: true,
          date: true,
          dueDate: true,
          status: true,
          total: true,
          amountPaid: true,
        },
      },
      payments: {
        orderBy: { date: "desc" },
        take: 8,
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
  });

  if (!customer) notFound();

  const title = customer.companyName ?? customer.name;

  // Per-invoice balances are shown to everyone — an engineer chasing payment
  // needs them. The lifetime-business and total-received aggregates below are
  // company financials and stay admin-only.
  const openInvoices = customer.invoices.filter((invoice) => {
    const balance = toMoney(invoice.total) - toMoney(invoice.amountPaid);
    return balance > 0.009 && invoice.status !== "CANCELLED";
  });

  const outstanding = round2(
    openInvoices.reduce(
      (sum, invoice) =>
        sum + toMoney(invoice.total) - toMoney(invoice.amountPaid),
      0,
    ),
  );

  const lifetimeBilled = isAdmin
    ? round2(
        customer.invoices
          .filter((invoice) => invoice.status !== "CANCELLED")
          .reduce((sum, invoice) => sum + toMoney(invoice.total), 0),
      )
    : 0;

  const lifetimeReceived = isAdmin
    ? round2(
        customer.payments
          .filter((payment) => payment.status === "RECEIVED")
          .reduce((sum, payment) => sum + toMoney(payment.amount), 0),
      )
    : 0;

  return (
    <>
      <PageHeader
        title={title}
        description={customer.companyName ? customer.name : undefined}
        breadcrumbs={[
          { label: "Customers", href: "/customers" },
          { label: title },
        ]}
        actions={
          <>
            <Button href={`/quotations/new?customerId=${customer.id}`} variant="secondary">
              <Plus aria-hidden="true" />
              Quotation
            </Button>
            {isAdmin && (
              <Button href={`/customers/${customer.id}/edit`} variant="secondary">
                <Pencil aria-hidden="true" />
                Edit
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={customer.type} />
        {customer.phone && (
          <a
            href={`tel:${customer.phone}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-[13px] text-fg-muted transition-colors hover:text-fg"
          >
            <Phone aria-hidden="true" className="size-3.5" />
            {customer.phone}
          </a>
        )}
        {customer.email && (
          <a
            href={`mailto:${customer.email}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-[13px] text-fg-muted transition-colors hover:text-fg"
          >
            <Mail aria-hidden="true" className="size-3.5" />
            {customer.email}
          </a>
        )}
      </div>

      <StatGrid className={isAdmin ? undefined : "lg:grid-cols-2"}>
        {isAdmin && (
          <>
            <StatCard
              label="Lifetime billed"
              value={formatCurrency(lifetimeBilled)}
              icon={<Receipt />}
              tone="accent"
              hint={`${customer.invoices.length} invoices`}
            />
            <StatCard
              label="Received"
              value={formatCurrency(lifetimeReceived)}
              icon={<Wallet2 />}
              tone="success"
            />
          </>
        )}
        <StatCard
          label="Outstanding"
          value={formatCurrency(outstanding)}
          icon={<Wallet2 />}
          tone={outstanding > 0 ? "warning" : "neutral"}
          hint={`${openInvoices.length} open invoice(s)`}
        />
        <StatCard
          label="Quotations"
          value={customer.quotations.length}
          icon={<FileText />}
          tone="neutral"
        />
      </StatGrid>

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Details" />
          <CardBody>
            <DetailList
              items={[
                { label: "GSTIN", value: customer.gstin },
                { label: "PAN", value: customer.pan },
                {
                  label: "Address",
                  value: formatAddress(customer),
                  wide: true,
                },
                { label: "Account owner", value: customer.owner?.name },
                { label: "Added by", value: customer.createdBy.name },
                { label: "Added on", value: formatDate(customer.createdAt) },
                ...(customer.notes
                  ? [{ label: "Notes", value: customer.notes, wide: true }]
                  : []),
              ]}
            />
          </CardBody>
        </Card>

        <div className="flex min-w-0 flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader
              title="Invoices"
              action={
                <Button
                  href={`/invoices/new?customerId=${customer.id}`}
                  variant="ghost"
                  size="sm"
                >
                  <Plus aria-hidden="true" />
                  New
                </Button>
              }
            />
            {customer.invoices.length === 0 ? (
              <EmptyState
                title="No invoices yet"
                description="Nothing has been billed to this customer."
                icon={<Receipt />}
              />
            ) : (
              <ul className="divide-y divide-border">
                {customer.invoices.slice(0, 8).map((invoice) => {
                  const balance = round2(
                    toMoney(invoice.total) - toMoney(invoice.amountPaid),
                  );
                  return (
                    <li key={invoice.id}>
                      <a
                        href={`/invoices/${invoice.id}`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted sm:px-5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-[13px] font-medium text-fg">
                            {invoice.number}
                          </p>
                          <p className="text-[12px] text-fg-muted">
                            {formatDate(invoice.date)}
                            {invoice.dueDate
                              ? ` · due ${formatDate(invoice.dueDate)}`
                              : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="tnum text-[13.5px] font-semibold text-fg">
                            {formatCurrency(invoice.total)}
                          </p>
                          {balance > 0.009 ? (
                            <p className="tnum text-[12px] text-warning">
                              {formatCurrency(balance)} due
                            </p>
                          ) : (
                            <StatusBadge status={invoice.status} dot={false} />
                          )}
                        </div>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Quotations"
              action={
                <Button
                  href={`/quotations/new?customerId=${customer.id}`}
                  variant="ghost"
                  size="sm"
                >
                  <Plus aria-hidden="true" />
                  New
                </Button>
              }
            />
            {customer.quotations.length === 0 ? (
              <EmptyState
                title="No quotations yet"
                description="Quote for a job to get started."
                icon={<FileText />}
              />
            ) : (
              <ul className="divide-y divide-border">
                {customer.quotations.map((quotation) => (
                  <li key={quotation.id}>
                    <a
                      href={`/quotations/${quotation.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted sm:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[13px] font-medium text-fg">
                          {quotation.number}
                        </p>
                        <p className="text-[12px] text-fg-muted">
                          {formatDate(quotation.date)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tnum text-[13.5px] font-semibold text-fg">
                          {formatCurrency(quotation.total)}
                        </p>
                        <StatusBadge status={quotation.status} dot={false} />
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {customer.payments.length > 0 && (
            <Card>
              <CardHeader title="Recent payments" />
              <ul className="divide-y divide-border">
                {customer.payments.map((payment) => (
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
        </div>
      </div>
    </>
  );
}
