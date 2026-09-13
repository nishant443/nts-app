import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Select-box options shared by the create and edit task forms: who can be
 * assigned work, and which customer sites it can be linked to.
 */
export async function loadTaskFormOptions(): Promise<{
  employees: { id: string; label: string }[];
  customers: { id: string; label: string }[];
}> {
  const [users, customers] = await Promise.all([
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      // Engineers first — they are who tasks are for — then admins.
      orderBy: [{ role: "desc" }, { name: "asc" }],
      select: { id: true, name: true, employeeCode: true, role: true },
    }),
    prisma.customer.findMany({
      where: { type: { not: "VENDOR" } },
      orderBy: [{ companyName: "asc" }, { name: "asc" }],
      select: { id: true, name: true, companyName: true },
    }),
  ]);

  return {
    employees: users.map((user) => ({
      id: user.id,
      label: `${user.name} · ${user.employeeCode}${user.role === "ADMIN" ? " (admin)" : ""}`,
    })),
    customers: customers.map((customer) => ({
      id: customer.id,
      label: customer.companyName ?? customer.name,
    })),
  };
}
