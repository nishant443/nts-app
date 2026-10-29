import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/rate-limit";

export type AuditEntity =
  | "User"
  | "SalaryStructure"
  | "Attendance"
  | "WorkLocation"
  | "LeaveRequest"
  | "PayrollRun"
  | "Payslip"
  | "DailyWorkLog"
  | "Expense"
  | "Task"
  | "Customer"
  | "Quotation"
  | "Invoice"
  | "Payment"
  | "PurchaseOrder"
  | "Document"
  | "CompanySettings"
  | "Auth";

interface AuditInput {
  userId: string | null;
  action: string;
  entity: AuditEntity;
  entityId?: string | null;
  meta?: Record<string, unknown>;
}

async function requestIpHash(): Promise<string | null> {
  try {
    const headerList = await headers();
    const ip = clientIp(headerList);
    if (ip === "unknown") return null;
    return createHash("sha256").update(ip).digest("hex").slice(0, 32);
  } catch {
    return null;
  }
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        meta: (input.meta ?? undefined) as never,
        ipHash: await requestIpHash(),
      },
    });
  } catch (error) {
    console.error("[audit] failed to record", input.action, error);
  }
}
