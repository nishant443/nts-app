/**
 * One-off import of NTS's real operating data from the working spreadsheet
 * (Pending_Tasks_Clean-1.xlsx): ShivaKumara's daily work, Nishant's task list,
 * and the pending-payments register. Also clears the sample work data that was
 * seeded against Shankar M N, leaving his account in place.
 *
 * Every write is keyed on a natural identifier (email, invoice number, date +
 * customer, date + title) so the script can be re-run without doubling up.
 *
 * Run: npx tsx scripts/import-real-data.ts "<path to xlsx>"
 */

import "dotenv/config";

import { randomBytes } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";

import { PrismaClient } from "../src/generated/prisma/client";
import type { LeaveType, TaskStatus } from "../src/generated/prisma/enums";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const file = process.argv[2];
if (!file) throw new Error("Pass the spreadsheet path as the first argument.");

// --- Helpers -----------------------------------------------------------------

/** "01/08/26" or "14.07.26" → UTC midnight, matching how the app stores days. */
function parseDay(value: string): Date {
  const m = value.trim().match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (!m) throw new Error(`Unparseable date: ${value}`);
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return new Date(Date.UTC(year, Number(m[2]) - 1, Number(m[1])));
}

function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** A time of day in IST on a given calendar day. */
function atIst(date: Date, hours: number, minutes = 0): Date {
  return new Date(date.getTime() + ((hours - 5) * 60 + (minutes - 30)) * 60_000);
}

function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * 86_400_000);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object") {
    if ("result" in v && v.result !== undefined) return String(v.result);
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return String(v.text);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
  }
  return String(v);
}

function cellNumber(v: ExcelJS.CellValue): number | null {
  const text = cellText(v).replace(/[,\s]/g, "");
  if (text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function rows(ws: ExcelJS.Worksheet): string[][] {
  const out: string[][] = [];
  ws.eachRow((row) => out.push((row.values as ExcelJS.CellValue[]).slice(1).map(cellText)));
  return out;
}

const log = (line: string) => console.log(line);

// --- Customer name matching --------------------------------------------------

/** Spreadsheet shorthand → company name in the app. */
const CUSTOMER_ALIASES: Record<string, string> = {
  jrvd: "JRVD Defspace Technologies",
  benaka: "Benaka",
  nova: "Nova",
  ofc: "OFC",
  "ripple technology": "Ripple Technology Solutions",
  "multi teck": "MultiTeck Engineering",
  multiteck: "MultiTeck Engineering",
  wendt: "Wendt India Ltd",
  "wendt india": "Wendt India Ltd",
  mazak: "Yamazaki Mazak India Pvt Ltd",
  "meril health": "Meril Life Sciences Pvt Ltd",
  "niharika aerospace": "Niharika Aerospace Pvt Ltd",
  "pmi engineering export pvt ltd": "PMI Exports",
  "san engineering": "San Engineering & Locomotive Co",
  "san engineering mysore": "San Engineering & Locomotive Co",
};

/** Sites in the sheet that are not customers at all. */
const INTERNAL = new Set(["nts", "inventory"]);

async function customerByName(
  raw: string,
  createdById: string,
): Promise<{ id: string; state: string | null } | null> {
  const key = raw.trim().toLowerCase();
  if (!key || INTERNAL.has(key)) return null;

  const wanted = CUSTOMER_ALIASES[key] ?? raw.trim();
  const existing = await prisma.customer.findFirst({
    where: { companyName: { equals: wanted, mode: "insensitive" } },
    select: { id: true, state: true, type: true },
  });
  if (existing) {
    // Real work has been done for them — a "lead" or "inactive" flag is stale.
    if (existing.type === "LEAD" || existing.type === "INACTIVE") {
      await prisma.customer.update({ where: { id: existing.id }, data: { type: "ACTIVE" } });
    }
    return existing;
  }

  const created = await prisma.customer.create({
    data: {
      name: wanted,
      companyName: wanted,
      type: "ACTIVE",
      country: "India",
      notes: "Created from the work/payments spreadsheet import. Contact details to be filled in.",
      createdById,
    },
    select: { id: true, state: true },
  });
  log(`  + customer ${wanted}`);
  return created;
}

// --- Main ------------------------------------------------------------------------

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);

  const admin = await prisma.user.findFirstOrThrow({
    where: { role: "ADMIN", status: "ACTIVE" },
    orderBy: { employeeCode: "asc" },
    select: { id: true, name: true },
  });
  const homeState =
    (await prisma.companySettings.findFirst({ select: { homeState: true } }))?.homeState ??
    "Karnataka";
  const thisYear = new Date().getUTCFullYear();

  // --- 1. Shankar: keep the person, drop the sample work data -----------------
  log("\n→ Clearing Shankar M N's sample work data");
  const shankar = await prisma.user.findUnique({
    where: { email: "shankar@ntss.co.in" },
    select: { id: true },
  });
  if (shankar) {
    const where = { userId: shankar.id };
    const [att, exp, logs, leave, slips, tasks, notes] = await prisma.$transaction([
      prisma.attendance.deleteMany({ where }),
      prisma.expense.deleteMany({ where }),
      prisma.dailyWorkLog.deleteMany({ where }),
      prisma.leaveRequest.deleteMany({ where }),
      prisma.payslip.deleteMany({ where }),
      prisma.task.deleteMany({ where: { assigneeId: shankar.id } }),
      prisma.notification.deleteMany({ where }),
    ]);
    await prisma.leaveBalance.updateMany({ where, data: { used: 0 } });
    log(
      `  removed ${att.count} attendance, ${logs.count} work reports, ${exp.count} expenses, ` +
        `${leave.count} leave requests, ${slips.count} payslips, ${tasks.count} tasks, ${notes.count} notifications`,
    );
  } else {
    log("  (no such user — skipped)");
  }

  // --- 2. Employees ----------------------------------------------------------
  log("\n→ Employees");
  const passwords: Record<string, string> = {};

  async function ensureEmployee(spec: {
    code: string;
    name: string;
    email: string;
    designation: string;
    department: string;
    joined: Date;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: spec.email } });
    if (existing) {
      log(`  = ${spec.name} already exists (${existing.employeeCode})`);
      return existing;
    }
    const password = randomBytes(9).toString("base64url");
    passwords[spec.email] = password;

    const user = await prisma.user.create({
      data: {
        employeeCode: spec.code,
        name: spec.name,
        email: spec.email,
        role: "EMPLOYEE",
        status: "ACTIVE",
        passwordHash: await bcrypt.hash(password, 12),
        profile: {
          create: {
            designation: spec.designation,
            department: spec.department,
            employmentType: "FULL_TIME",
            dateOfJoining: spec.joined,
            city: "Bengaluru",
            state: "Karnataka",
          },
        },
      },
    });
    const entitlements: [LeaveType, number][] = [
      ["CASUAL", 12],
      ["SICK", 8],
      ["EARNED", 15],
    ];
    for (const [type, allocated] of entitlements) {
      await prisma.leaveBalance.create({
        data: { userId: user.id, year: thisYear, type, allocated, used: 0 },
      });
    }
    log(`  + ${spec.code} ${spec.name} — ${spec.designation}`);
    return user;
  }

  const nishant = await ensureEmployee({
    code: "NTS-006",
    name: "Nishant",
    email: "nishant@ntss.co.in",
    designation: "Business Operations Executive",
    department: "Operations",
    joined: day("2026-09-01"),
  });
  const shiva = await ensureEmployee({
    code: "NTS-007",
    name: "ShivaKumara",
    email: "shivakumara@ntss.co.in",
    designation: "Service Engineer",
    department: "Service",
    joined: day("2026-08-01"),
  });

  // --- 3. ShivaKumara's daily work -------------------------------------------
  log("\n→ ShivaKumara's work reports");
  const shivaRows = rows(wb.getWorksheet("Shiva Bhaiya")!).slice(1);
  const perDay = new Map<string, number>();
  const entries: { date: Date; customer: string; details: string }[] = [];
  for (const [, dateText, customer, details] of shivaRows) {
    if (!dateText || /sunday/i.test(dateText) || !details) continue;
    const date = parseDay(dateText);
    entries.push({ date, customer, details });
    perDay.set(date.toISOString(), (perDay.get(date.toISOString()) ?? 0) + 1);
  }

  let logsCreated = 0;
  for (const entry of entries) {
    const customer = await customerByName(entry.customer, admin.id);
    const bullets = entry.details
      .split("\n")
      .map((l) => l.replace(/^•\s*/, "").trim())
      .filter(Boolean);
    const site = entry.customer.trim();
    const title = (INTERNAL.has(site.toLowerCase()) ? bullets[0] : `${site} — ${bullets[0]}`).slice(0, 160);
    const description = bullets.map((b) => `• ${b}`).join("\n");
    // Two visits on one day share it.
    const hoursSpent = perDay.get(entry.date.toISOString())! > 1 ? 4 : 8;

    const dup = await prisma.dailyWorkLog.findFirst({
      where: { userId: shiva.id, date: entry.date, title },
      select: { id: true },
    });
    if (dup) continue;

    await prisma.dailyWorkLog.create({
      data: {
        userId: shiva.id,
        date: entry.date,
        title,
        description,
        hoursSpent,
        customerId: customer?.id ?? null,
        // Historical record already accounted for — no approval queue.
        status: "APPROVED",
        reviewedById: admin.id,
        reviewedAt: atIst(addDays(entry.date, 1), 9),
        createdAt: atIst(entry.date, 18),
      },
    });
    logsCreated++;
  }
  log(`  + ${logsCreated} work reports (${entries.length} in sheet)`);

  let attCreated = 0;
  for (const iso of perDay.keys()) {
    const date = new Date(iso);
    await prisma.attendance.upsert({
      where: { userId_date: { userId: shiva.id, date } },
      update: {},
      create: {
        userId: shiva.id,
        date,
        status: "PRESENT",
        checkInAt: atIst(date, 9),
        checkOutAt: atIst(date, 18),
        workedMinutes: 540,
        source: "IMPORT",
        notes: "From the daily work sheet",
      },
    });
    attCreated++;
  }
  log(`  + attendance marked present on ${attCreated} days`);

  // --- 4. Nishant's task list ---------------------------------------------------
  log("\n→ Nishant's tasks");
  const taskRows = rows(wb.getWorksheet("Pending Tasks")!);
  let section: Date | null = null;
  let tasksCreated = 0;
  let tasksSkipped = 0;
  for (const row of taskRows) {
    const [no, task, statusText, remark] = row;
    const header = (no || "").match(/pending\s+(\d{2}\/\d{2}\/\d{2,4})/i);
    if (header) {
      // "07/09/2007" in the sheet is a typo for 2026 — every other section says so.
      section = parseDay(header[1].replace(/\/2007$/, "/2026"));
      continue;
    }
    if (!section || no === "No." || !task?.trim()) continue;

    const status: TaskStatus = /completed/i.test(statusText)
      ? "COMPLETED"
      : /started/i.test(statusText)
        ? "IN_PROGRESS"
        : "OPEN";
    const title = task.trim().replace(/\s+/g, " ").slice(0, 160);

    const dup = await prisma.task.findFirst({
      where: { assigneeId: nishant.id, title, dueDate: section },
      select: { id: true },
    });
    if (dup) {
      tasksSkipped++;
      continue;
    }

    const note = remark?.trim() || null;
    await prisma.task.create({
      data: {
        title,
        description:
          status === "COMPLETED" || !note ? task.trim() : `${task.trim()}\n\nRemark: ${note}`,
        priority: /payment|bill|invoice/i.test(title) ? "HIGH" : "MEDIUM",
        status,
        dueDate: section,
        assigneeId: nishant.id,
        assignedById: admin.id,
        startedAt: status === "OPEN" ? null : atIst(section, 9, 30),
        completedAt: status === "COMPLETED" ? atIst(section, 18) : null,
        completionNote: status === "COMPLETED" ? note : null,
        createdAt: atIst(section, 9),
      },
    });
    tasksCreated++;
  }
  log(`  + ${tasksCreated} tasks${tasksSkipped ? ` (${tasksSkipped} already present)` : ""}`);

  // --- 5. Pending payments → invoices and receipts ----------------------------
  log("\n→ Invoices and payments");

  // Dates for invoice numbers we know from the MultiTeck summary; the rest are
  // interpolated on the sequence and flagged in the invoice notes.
  const KNOWN_DATES: Record<number, string> = {
    19: "2026-08-01",
    20: "2026-08-05",
    23: "2026-08-14",
    26: "2026-08-23",
    29: "2026-09-10",
  };
  const ESTIMATED_DATES: Record<number, string> = {
    3: "2026-04-18",
    4: "2026-04-25",
    15: "2026-07-05",
    17: "2026-07-18",
    18: "2026-07-25",
    22: "2026-08-11",
    24: "2026-08-17",
    27: "2026-08-29",
  };

  interface InvoiceSpec {
    number: string;
    customer: string;
    description: string;
    total: number;
    date: string;
    estimatedDate: boolean;
    note?: string;
  }

  const specs: InvoiceSpec[] = [];

  // MultiTeck: the invoice summary sheet is the detailed source.
  for (const [number, date, description, amount] of rows(wb.getWorksheet("Multiteck_Invoice")!)) {
    if (!/^NTS\//.test(number)) continue;
    specs.push({
      number,
      customer: "Multi teck",
      description,
      total: Number(amount),
      date: date.slice(0, 10),
      estimatedDate: false,
    });
  }

  for (const [, customer, number, description, amount] of rows(wb.getWorksheet("Pending payments")!).slice(1)) {
    const total = cellNumber(amount);
    if (!customer || total === null) continue; // GE BE: no amount yet, nothing to bill
    if (/multi\s*teck/i.test(customer)) continue; // covered above in full
    const seqMatch = number?.match(/(\d+)\s*$/);
    const seq = seqMatch ? Number(seqMatch[1]) : null;
    let invoiceNumber = number?.trim();
    let note: string | undefined;
    if (/^4 and 7$/i.test(number)) {
      invoiceNumber = "NTS/26-27/4";
      note = "Combined figure for invoices 4 and 7 as recorded in the payments sheet; split when the individual amounts are confirmed.";
    } else if (!invoiceNumber) {
      invoiceNumber = `NTS/26-27/TBD-${customer.trim().replace(/\s+/g, "-").toUpperCase()}`;
      note = "Invoice number not yet recorded in the payments sheet — replace with the real number.";
    }
    const seqForDate = /^4 and 7$/i.test(number) ? 4 : seq;
    const known = seqForDate !== null ? KNOWN_DATES[seqForDate] : undefined;
    const estimated = seqForDate !== null ? ESTIMATED_DATES[seqForDate] : undefined;
    specs.push({
      number: invoiceNumber,
      customer,
      description: description.trim(),
      total,
      date: known ?? estimated ?? "2026-09-01",
      estimatedDate: !known,
      note,
    });
  }

  const invoiceIds = new Map<string, string>();
  let invCreated = 0;
  for (const spec of specs) {
    const existing = await prisma.invoice.findUnique({ where: { number: spec.number }, select: { id: true } });
    if (existing) {
      invoiceIds.set(spec.number, existing.id);
      continue;
    }
    const customer = (await customerByName(spec.customer, admin.id))!;
    const date = day(spec.date);
    const taxable = round2(spec.total / 1.18);
    const tax = round2(spec.total - taxable);
    const intra = (customer.state ?? homeState) === homeState;
    const cgst = intra ? round2(tax / 2) : 0;
    const sgst = intra ? round2(tax - cgst) : 0;
    const igst = intra ? 0 : tax;

    const notes = [
      spec.estimatedDate ? "Invoice date estimated from the sequence number — correct it if you have the original." : null,
      spec.note ?? null,
      "Imported from the pending-payments sheet.",
    ]
      .filter(Boolean)
      .join(" ");

    const created = await prisma.invoice.create({
      data: {
        number: spec.number,
        customerId: customer.id,
        date,
        dueDate: addDays(date, 30),
        status: "SENT",
        subject: spec.description.slice(0, 200),
        notes,
        placeOfSupply: customer.state ?? homeState,
        subtotal: taxable,
        discountAmount: 0,
        taxableAmount: taxable,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        total: spec.total,
        amountPaid: 0,
        createdById: admin.id,
        createdAt: atIst(date, 11),
        items: {
          create: {
            position: 0,
            description: spec.description,
            hsnCode: "9987",
            quantity: 1,
            unit: "Nos",
            unitPrice: taxable,
            taxRate: 18,
            lineTotal: taxable,
          },
        },
      },
      select: { id: true },
    });
    invoiceIds.set(spec.number, created.id);
    invCreated++;
    log(`  + ${spec.number.padEnd(22)} ${String(spec.total).padStart(10)}  ${spec.customer.trim()}`);
  }
  log(`  ${invCreated} invoices created`);

  // Receipts. MultiTeck paid 2,39,105 against their five invoices (oldest first);
  // JRVD paid 1,20,000 against NTS/26-27/18. Dates are the sheet update dates.
  const receipts: { number: string; amount: number; date: string; ref: string }[] = [];
  let remaining = 239105;
  for (const number of ["NTS/26-27/19", "NTS/26-27/20", "NTS/26-27/23", "NTS/26-27/26", "NTS/26-27/29"]) {
    if (remaining <= 0) break;
    const spec = specs.find((s) => s.number === number)!;
    const amount = Math.min(remaining, spec.total);
    receipts.push({ number, amount, date: "2026-09-12", ref: "MultiTeck payment as per invoice summary sheet" });
    remaining = round2(remaining - amount);
  }
  receipts.push({ number: "NTS/26-27/18", amount: 120000, date: "2026-08-20", ref: "Part payment as per pending-payments sheet" });

  let payCreated = 0;
  for (const receipt of receipts) {
    const invoiceId = invoiceIds.get(receipt.number)!;
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    const dup = await prisma.payment.findFirst({ where: { invoiceId, amount: receipt.amount }, select: { id: true } });
    if (dup) continue;
    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          customerId: invoice.customerId,
          invoiceId,
          date: day(receipt.date),
          amount: receipt.amount,
          mode: "NEFT",
          status: "RECEIVED",
          notes: `${receipt.ref}. Payment date is the date the sheet was updated, not necessarily the bank date.`,
          recordedById: admin.id,
        },
      });
      const sum = await tx.payment.aggregate({ where: { invoiceId, status: "RECEIVED" }, _sum: { amount: true } });
      await tx.invoice.update({ where: { id: invoiceId }, data: { amountPaid: sum._sum.amount ?? 0 } });
    });
    payCreated++;
  }
  log(`  + ${payCreated} payments recorded`);

  // Statuses follow the app's own rule: paid / partially paid / overdue / sent.
  const now = new Date();
  for (const invoiceId of invoiceIds.values()) {
    const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    const total = Number(inv.total);
    const paid = Number(inv.amountPaid);
    const balance = round2(total - paid);
    const overdue = inv.dueDate !== null && inv.dueDate < now;
    const status =
      balance <= 0.009 ? "PAID" : paid > 0.009 ? (overdue ? "OVERDUE" : "PARTIALLY_PAID") : overdue ? "OVERDUE" : "SENT";
    if (status !== inv.status) await prisma.invoice.update({ where: { id: invoiceId }, data: { status } });
  }

  // Real invoices are numbered NTS/26-27/N; make new ones continue that series.
  await prisma.companySettings.updateMany({ data: { invoicesPrefix: "NTS/" } });
  log("  invoice prefix set to NTS/ so the next invoice is NTS/26-27/30");

  // --- Summary -----------------------------------------------------------------
  const outstanding = await prisma.invoice.findMany({
    where: { number: { startsWith: "NTS/26-27/" }, status: { not: "PAID" } },
    orderBy: { number: "asc" },
    select: { number: true, total: true, amountPaid: true, status: true, customer: { select: { companyName: true } } },
  });
  log("\n→ Outstanding after import");
  let totalBalance = 0;
  for (const inv of outstanding) {
    const bal = round2(Number(inv.total) - Number(inv.amountPaid));
    totalBalance = round2(totalBalance + bal);
    log(`  ${inv.number.padEnd(28)} ${inv.status.padEnd(15)} ${bal.toFixed(2).padStart(12)}  ${inv.customer.companyName}`);
  }
  log(`  ${"Total outstanding".padEnd(44)} ${totalBalance.toFixed(2).padStart(12)}`);

  if (Object.keys(passwords).length) {
    log("\n→ New sign-ins (change on first login):");
    for (const [email, password] of Object.entries(passwords)) log(`  ${email}  /  ${password}`);
  }
}

main()
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
