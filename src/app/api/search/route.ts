import { z } from "zod";

import { json, parseQuery, withRoute } from "@/lib/api";
import { formatCurrency, toMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import type { SearchHit } from "@/components/layout/global-search";

const querySchema = z.object({
  q: z.string().trim().min(2).max(80),
});

/**
 * Global search.
 *
 * Results are scoped by role on the server: an employee never gets employee
 * records or payment rows back, regardless of what they type. Each kind is
 * capped so one prolific match cannot crowd out the others.
 */
export const GET = withRoute({ access: "user" }, async ({ request, user }) => {
  const { q } = parseQuery(request, querySchema);
  const isAdmin = user!.role === "ADMIN";

  const contains = { contains: q, mode: "insensitive" as const };

  const [customers, invoices, quotations, employees] = await Promise.all([
    prisma.customer.findMany({
      where: {
        OR: [
          { name: contains },
          { companyName: contains },
          { gstin: contains },
          { phone: contains },
          { email: contains },
        ],
      },
      take: 5,
      orderBy: { companyName: "asc" },
      select: {
        id: true,
        name: true,
        companyName: true,
        city: true,
        type: true,
      },
    }),

    prisma.invoice.findMany({
      where: {
        OR: [
          { number: contains },
          { subject: contains },
          { customer: { OR: [{ name: contains }, { companyName: contains }] } },
        ],
        // An employee only finds invoices they are connected to. Prisma ANDs
        // top-level keys, so this narrows the text match above rather than
        // widening it.
        ...(isAdmin
          ? {}
          : {
              AND: [
                {
                  OR: [
                    { createdById: user!.id },
                    { customer: { ownerId: user!.id } },
                  ],
                },
              ],
            }),
      },
      take: 5,
      orderBy: { date: "desc" },
      select: {
        id: true,
        number: true,
        total: true,
        status: true,
        customer: { select: { name: true, companyName: true } },
      },
    }),

    prisma.quotation.findMany({
      where: {
        OR: [
          { number: contains },
          { subject: contains },
          { customer: { OR: [{ name: contains }, { companyName: contains }] } },
        ],
      },
      take: 5,
      orderBy: { date: "desc" },
      select: {
        id: true,
        number: true,
        total: true,
        status: true,
        customer: { select: { name: true, companyName: true } },
      },
    }),

    // Employee records are administrative data — admins only.
    isAdmin
      ? prisma.user.findMany({
          where: {
            OR: [
              { name: contains },
              { email: contains },
              { employeeCode: contains },
            ],
          },
          take: 5,
          orderBy: { employeeCode: "asc" },
          select: {
            id: true,
            name: true,
            employeeCode: true,
            profile: { select: { designation: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const results: SearchHit[] = [
    ...customers.map((customer) => ({
      id: customer.id,
      kind: "customer" as const,
      title: customer.companyName ?? customer.name,
      subtitle: [customer.city, customer.type.toLowerCase()]
        .filter(Boolean)
        .join(" · "),
      href: `/customers/${customer.id}`,
    })),

    ...invoices.map((invoice) => ({
      id: invoice.id,
      kind: "invoice" as const,
      title: invoice.number,
      subtitle: `${invoice.customer.companyName ?? invoice.customer.name} · ${formatCurrency(toMoney(invoice.total))}`,
      href: `/invoices/${invoice.id}`,
    })),

    ...quotations.map((quotation) => ({
      id: quotation.id,
      kind: "quotation" as const,
      title: quotation.number,
      subtitle: `${quotation.customer.companyName ?? quotation.customer.name} · ${formatCurrency(toMoney(quotation.total))}`,
      href: `/quotations/${quotation.id}`,
    })),

    ...employees.map((employee) => ({
      id: employee.id,
      kind: "employee" as const,
      title: employee.name,
      subtitle: [employee.employeeCode, employee.profile?.designation]
        .filter(Boolean)
        .join(" · "),
      href: `/admin/employees/${employee.id}`,
    })),
  ];

  return json({ results });
});
