/**
 * Replaces all invoices, payments and quotations with NTS's real sales history
 * from the Vyapar "Sale Report" exports (FY 2025-26 and FY 2026-27), and sets
 * up every customer on those reports with its legal name, GSTIN, PAN and state.
 *
 * The rows below are transcribed from the PDFs; each report's sum is asserted
 * against the printed "Total Sale" before anything is written, so a typo in
 * the transcription stops the import rather than corrupting the ledger.
 *
 * Run: npx tsx scripts/import-sales.ts
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// --- Customers on the reports --------------------------------------------------
// Keyed by GSTIN, which is the one identifier Vyapar prints consistently.
// `aliases` are the names the app already holds for the same company (from
// the seed or yesterday's spreadsheet import) so the record is updated, not
// duplicated.

const CUSTOMERS: { gstin: string; name: string; aliases?: string[] }[] = [
  { gstin: "29AAMFM2747E1Z2", name: "Multi Teck Engineering Solutions", aliases: ["MultiTeck Engineering"] },
  { gstin: "27AAACY3446R1ZN", name: "Yamazaki Mazak India Pvt Ltd" },
  { gstin: "24AAHCM1406E1Z1", name: "Meril Healthcare Pvt Ltd", aliases: ["Meril Life Sciences Pvt Ltd"] },
  { gstin: "29AAECS5331H1ZA", name: "San Engineering and Locomotives Co", aliases: ["San Engineering & Locomotive Co"] },
  { gstin: "29AAGCJ3131J1ZI", name: "JRVD Defspace Technologies Pvt Ltd", aliases: ["JRVD Defspace Technologies"] },
  { gstin: "33AAACW1410D1Z5", name: "Wendt (India) Limited", aliases: ["Wendt India Ltd"] },
  { gstin: "29AJLPK5542K1ZP", name: "Niharika Aerospace", aliases: ["Niharika Aerospace Pvt Ltd"] },
  { gstin: "09AAVCA6457D1Z8", name: "Ordnance Factory Kanpur", aliases: ["OFC"] },
  { gstin: "29AAGFV0897E1ZS", name: "VPI Innovative Solutions" },
  { gstin: "29ABDPV7711M6ZV", name: "Nova International Tools", aliases: ["Nova"] },
  { gstin: "36AAACL4244L1ZF", name: "Lokesh Machines Limited" },
  { gstin: "29AACCP4217B1ZS", name: "Pragati Automation Pvt Ltd" },
  { gstin: "29AADCS9937J1ZM", name: "Sphoorti Machine Tools Pvt Ltd", aliases: ["Sphoorti"] },
  { gstin: "19AAACI6561R1ZU", name: "IFB Industries Ltd" },
  { gstin: "29AAJFR0193G1Z0", name: "Ripple Technologies", aliases: ["Ripple Technology Solutions"] },
  { gstin: "29AALCB2469A1ZP", name: "Benka Tools and Dies Pvt Ltd", aliases: ["Benaka"] },
  { gstin: "29AAUCM2240B1ZI", name: "Machzion Private Ltd" },
  { gstin: "29FNGPS7600C1ZV", name: "Swedot Manufacturing Solutions" },
  { gstin: "29AABCA4362P1Z9", name: "ASM Technologies Limited" },
  { gstin: "27ATYPP1378F1Z0", name: "Rajas Technical Solution" },
  { gstin: "29AAOFS1133J1ZX", name: "Srinivas Transmission System" },
  { gstin: "27AAATI0898N1Z2", name: "Indo German Tool Room" },
  { gstin: "33AACCJ2259F1ZV", name: "Johnson Electronic Pvt Ltd" },
];

/** Seeded sample customers with no real records behind them. */
const SAMPLE_CUSTOMERS_TO_REMOVE = ["GI Auto Parts Pvt Ltd"];

/** Real customers from the site-visit log that are not on the sale reports. */
const RENAME_ONLY: { from: string; to: string }[] = [
  { from: "PMI Exports", to: "PMI Engineering Exports Pvt Ltd" },
];

const GST_STATES: Record<string, string> = {
  "09": "Uttar Pradesh",
  "19": "West Bengal",
  "24": "Gujarat",
  "27": "Maharashtra",
  "29": "Karnataka",
  "33": "Tamil Nadu",
  "36": "Telangana",
};

// --- Sales -------------------------------------------------------------------------
// [date dd/mm/yyyy, invoice number as printed, GSTIN, total, received]
// Rows the report prints without a total (NTS/26-27/10, /11, /24; NTS/SL/25-26/36,
// /38, /39) are cancelled or zero-value and are not imported.

type Row = [string, string, string, number, number];

const FY_26_27: Row[] = [
  ["11/09/2026", "NTS/26-27/29", "29AAMFM2747E1Z2", 4720, 0],
  ["02/09/2026", "NTS/26-27/28", "27AAACY3446R1ZN", 68985, 0],
  ["02/09/2026", "NTS/26-27/27", "24AAHCM1406E1Z1", 931466.04, 0],
  ["23/08/2026", "NTS/26-27/26", "29AAMFM2747E1Z2", 16520, 0],
  ["18/08/2026", "NTS/26-27/25", "29AAECS5331H1ZA", 18290, 18290],
  ["14/08/2026", "NTS/26-27/23", "29AAMFM2747E1Z2", 23010, 18887.5],
  ["14/08/2026", "NTS/26-27/22", "33AAACW1410D1Z5", 17700, 0],
  ["10/08/2026", "NTS/26-27/21", "29AJLPK5542K1ZP", 67378, 67378],
  ["05/08/2026", "NTS/26-27/20", "29AAMFM2747E1Z2", 33040, 33040],
  ["01/08/2026", "NTS/26-27/19", "29AAMFM2747E1Z2", 187177.5, 187177.5],
  ["01/08/2026", "NTS/26-27/18", "29AAGCJ3131J1ZI", 135700, 120000],
  ["25/07/2026", "NTS/26-27/17", "09AAVCA6457D1Z8", 5074, 0],
  ["24/07/2026", "NTS/26-27/16", "29AAGFV0897E1ZS", 17700, 17700],
  ["22/07/2026", "NTS/26-27/15", "29ABDPV7711M6ZV", 4720, 0],
  ["15/07/2026", "NTS/26-27/14", "36AAACL4244L1ZF", 345740, 345740],
  ["25/06/2026", "NTS/26-27/13", "29AACCP4217B1ZS", 18880, 18800],
  ["19/06/2026", "NTS/26-27/12", "24AAHCM1406E1Z1", 522175, 522175],
  ["11/06/2026", "NTS/26-27/9", "29AAMFM2747E1Z2", 16520, 16240],
  ["09/06/2026", "NTS/26-27/8", "29ABDPV7711M6ZV", 19470, 19150],
  ["29/05/2026", "NTS/26-27/7", "27AAACY3446R1ZN", 60910, 60365],
  ["19/05/2026", "NTS/26-27/6", "29ABDPV7711M6ZV", 18880, 18880],
  ["15/05/2026", "NTS/26-27/5", "29AADCS9937J1ZM", 11800, 11800],
  ["06/05/2026", "NTS/26-27/4", "19AAACI6561R1ZU", 78718, 78118],
  ["06/05/2026", "NTS/26-27/3", "29AAJFR0193G1Z0", 14160, 0],
  ["19/04/2026", "NTS/26-27/2", "29AACCP4217B1ZS", 18880, 18880],
  ["07/04/2026", "NTS/26-27/1", "27AAACY3446R1ZN", 300660, 298090],
];
const FY_26_27_TOTAL = 2958273.54;

const FY_25_26: Row[] = [
  ["31/03/2026", "NTS/SL/25-26/37", "29AAJFR0193G1Z0", 9440, 0],
  ["30/03/2026", "NTS/SL/25-26/35", "29AAGCJ3131J1ZI", 14750, 14750],
  ["30/03/2026", "NTS/SL/25-26/34", "29AAGCJ3131J1ZI", 97940, 97940],
  ["30/03/2026", "NTS/SL/25-26/33", "29AAGCJ3131J1ZI", 109740, 109740],
  ["30/03/2026", "NTS/SL/25-26/32", "29AAGCJ3131J1ZI", 169920, 169920],
  ["30/03/2026", "NTS/SL/25-26/31", "29AAMFM2747E1Z2", 282610, 276000],
  ["30/03/2026", "NTS/SL/25-26/30", "29AAMFM2747E1Z2", 107380, 107380],
  ["25/03/2026", "NTS/SL/25-26/29", "29ABDPV7711M6ZV", 22125, 22125],
  ["25/03/2026", "NTS/SL/25-26/28", "29AADCS9937J1ZM", 70800, 70200],
  ["25/03/2026", "NTS/SL/25-26/27", "24AAHCM1406E1Z1", 70800, 0],
  ["23/03/2026", "NTS/SL/25-26/26", "29AAUCM2240B1ZI", 41300, 0],
  ["23/02/2026", "NTS/SL/25-26/25", "29FNGPS7600C1ZV", 7000, 7000],
  ["19/02/2026", "NTS/SL/2025-26/24", "29AAUCM2240B1ZI", 8496, 8496],
  ["19/02/2026", "NTS/SL/25-26/23", "29AACCP4217B1ZS", 9440, 9440],
  ["19/02/2026", "NTS/SL/2025-26/22", "29AABCA4362P1Z9", 60416, 59904],
  ["14/02/2026", "NTS/SL/2025-26/21", "29ABDPV7711M6ZV", 10620, 10620],
  ["03/02/2026", "NTS/SL/2025-26/20", "24AAHCM1406E1Z1", 349385.02, 349385.02],
  ["22/01/2026", "NTS/SL/2025-26/19", "36AAACL4244L1ZF", 201540, 0],
  ["03/01/2026", "NTS/SL/25-26/18", "29AACCP4217B1ZS", 92040, 92040],
  ["24/12/2025", "NTS/SL/2025-26/17", "29AAJFR0193G1Z0", 105960, 105960],
  ["15/12/2025", "NTS/SL/2025-26/16", "33AAACW1410D1Z5", 35400, 34200],
  ["15/12/2025", "NTS/SL/2025-26/15", "33AAACW1410D1Z5", 35400, 35400],
  ["15/12/2025", "NTS/SL/2025-26/14", "27ATYPP1378F1Z0", 186558, 184977],
  ["03/12/2025", "NTS/SL/2025-26/13", "29AAOFS1133J1ZX", 129800, 129800],
  ["17/11/2025", "NTS/SL/2025-26/12", "27AAATI0898N1Z2", 21830, 21460],
  ["17/11/2025", "NTS/SL/2025-26/11", "27AAATI0898N1Z2", 21830, 21830],
  ["07/11/2025", "NTS/SL/2025-26/10", "24AAHCM1406E1Z1", 56640, 56160],
  ["05/11/2025", "NTS/SL/2025-26/9", "29AAGCJ3131J1ZI", 43542, 43542],
  ["16/10/2025", "NTS/SL/2025-26/8", "29AALCB2469A1ZP", 148680, 148680],
  ["11/10/2025", "7", "27AAATI0898N1Z2", 65490, 59940],
  ["11/10/2025", "6", "29AAGCJ3131J1ZI", 249251, 249251],
  ["22/09/2025", "4", "29AAGCJ3131J1ZI", 519200, 519200],
  ["22/09/2025", "3", "29AAGCJ3131J1ZI", 413000, 413000],
  ["20/09/2025", "5", "29AAJFR0193G1Z0", 95580, 95580],
  ["12/09/2025", "1", "33AACCJ2259F1ZV", 155790, 154440],
  ["02/09/2025", "202", "29AAGCJ3131J1ZI", 141600, 139200],
];
const FY_25_26_TOTAL = 4161293.02;

// --- Helpers -----------------------------------------------------------------------

const round2 = (n: number) => Math.round(n * 100) / 100;

function parseDay(value: string): Date {
  const [d, m, y] = value.split("/").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * 86_400_000);
}

function assertTotal(label: string, rows: Row[], expected: number) {
  const sum = round2(rows.reduce((acc, r) => acc + r[3], 0));
  if (sum !== expected) {
    throw new Error(`${label}: transcribed rows sum to ${sum}, report says ${expected}`);
  }
  console.log(`  ${label}: ${rows.length} invoices, total ${sum.toLocaleString("en-IN")} ✓`);
}

// --- Main ------------------------------------------------------------------------------

async function main() {
  console.log("\n→ Checking transcription against the printed totals");
  assertTotal("FY 2026-27", FY_26_27, FY_26_27_TOTAL);
  assertTotal("FY 2025-26", FY_25_26, FY_25_26_TOTAL);

  const admin = await prisma.user.findFirstOrThrow({
    where: { role: "ADMIN", status: "ACTIVE" },
    orderBy: { employeeCode: "asc" },
    select: { id: true },
  });
  const homeState =
    (await prisma.companySettings.findFirst({ select: { homeState: true } }))?.homeState ?? "Karnataka";

  // --- 1. Company profile, as on the Vyapar business card ---------------------
  console.log("\n→ Company profile");
  await prisma.companySettings.updateMany({
    data: {
      name: "Nutan Tech Solutions",
      phone: "+91 90360 03236",
      email: "sales@ntss.co.in",
      addressLine1: "24108, 10th Floor, Prestige Jindal City",
      addressLine2: "7th Cross, Manjunatha Nagar, Bagalakunte",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560073",
      country: "India",
      gstin: "29BRMPS5212E2ZK",
      pan: "BRMPS5212E",
      homeState: "Karnataka",
    },
  });
  console.log("  updated name, phone, email, address, GSTIN, PAN");

  // --- 2. Out with the sample ledger -----------------------------------------------
  console.log("\n→ Removing existing invoices, payments and quotations");
  const [pay, inv, qi, quo, notes] = await prisma.$transaction([
    prisma.payment.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.quotationItem.deleteMany(),
    prisma.quotation.deleteMany(),
    prisma.notification.deleteMany({
      where: { type: { in: ["PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "QUOTATION_ACCEPTED"] } },
    }),
  ]);
  console.log(`  removed ${inv.count} invoices, ${pay.count} payments, ${quo.count} quotations (${qi.count} lines), ${notes.count} related notifications`);

  // --- 3. Customers --------------------------------------------------------------
  console.log("\n→ Customers");
  const customerIds = new Map<string, string>();

  for (const spec of CUSTOMERS) {
    const state = GST_STATES[spec.gstin.slice(0, 2)];
    if (!state) throw new Error(`Unknown state code on GSTIN ${spec.gstin}`);
    const pan = spec.gstin.slice(2, 12);

    const names = [spec.name, ...(spec.aliases ?? [])];
    const existing = await prisma.customer.findFirst({
      where: {
        OR: [
          { gstin: spec.gstin },
          { companyName: { in: names, mode: "insensitive" } },
          { name: { in: names, mode: "insensitive" } },
        ],
      },
      select: { id: true, notes: true },
    });

    // Real identity from the report. Sample contact people, phones and emails
    // that the seed invented are cleared rather than left next to a real GSTIN.
    const data = {
      name: spec.name,
      companyName: spec.name,
      type: "ACTIVE" as const,
      gstin: spec.gstin,
      pan,
      state,
      country: "India",
      email: null,
      phone: null,
      altPhone: null,
      website: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      postalCode: null,
    };

    if (existing) {
      await prisma.customer.update({ where: { id: existing.id }, data });
      customerIds.set(spec.gstin, existing.id);
    } else {
      const created = await prisma.customer.create({
        data: { ...data, createdById: admin.id, notes: "From the Vyapar sale report. Contact details to be added." },
        select: { id: true },
      });
      customerIds.set(spec.gstin, created.id);
      console.log(`  + ${spec.name}`);
    }
  }
  console.log(`  ${CUSTOMERS.length} customers set with legal name, GSTIN, PAN and state`);

  for (const { from, to } of RENAME_ONLY) {
    const r = await prisma.customer.updateMany({
      where: { companyName: from },
      data: { name: to, companyName: to, email: null, phone: null, altPhone: null, website: null, addressLine1: null, addressLine2: null, city: null, state: null, postalCode: null, type: "ACTIVE" },
    });
    if (r.count) console.log(`  ~ ${from} → ${to}`);
  }

  for (const name of SAMPLE_CUSTOMERS_TO_REMOVE) {
    const c = await prisma.customer.findFirst({
      where: { companyName: name },
      select: { id: true, _count: { select: { invoices: true, quotations: true, payments: true, purchaseOrders: true, workLogs: true, tasks: true } } },
    });
    if (!c) continue;
    const refs = Object.values(c._count).reduce((a, b) => a + b, 0);
    if (refs === 0) {
      await prisma.customer.delete({ where: { id: c.id } });
      console.log(`  - ${name} (sample, unused)`);
    }
  }

  // --- 4. Invoices and receipts -----------------------------------------------------
  console.log("\n→ Invoices");
  const now = new Date();
  let paymentsCreated = 0;

  for (const [fy, rows] of [["2026-27", FY_26_27], ["2025-26", FY_25_26]] as const) {
    for (const [dateText, number, gstin, total, received] of rows) {
      const customerId = customerIds.get(gstin);
      if (!customerId) throw new Error(`No customer for GSTIN ${gstin}`);
      const state = GST_STATES[gstin.slice(0, 2)];
      const date = parseDay(dateText);

      // Vyapar prints only the grand total; back out 18% GST for the split.
      const taxable = round2(total / 1.18);
      const tax = round2(total - taxable);
      const intra = state === homeState;
      const cgst = intra ? round2(tax / 2) : 0;
      const sgst = intra ? round2(tax - cgst) : 0;
      const igst = intra ? 0 : tax;

      const dueDate = addDays(date, 30);
      const balance = round2(total - received);
      const overdue = dueDate < now;
      const status =
        balance <= 0.009 ? "PAID" : received > 0.009 ? (overdue ? "OVERDUE" : "PARTIALLY_PAID") : overdue ? "OVERDUE" : "SENT";

      const invoice = await prisma.invoice.create({
        data: {
          number,
          customerId,
          date,
          dueDate,
          status,
          subject: null,
          notes: `Imported from the Vyapar sale report (FY ${fy}). GST split assumes 18%; line detail is on the original invoice.`,
          placeOfSupply: state,
          subtotal: taxable,
          discountAmount: 0,
          taxableAmount: taxable,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          total,
          amountPaid: received,
          createdById: admin.id,
          createdAt: date,
          items: {
            create: {
              position: 0,
              description: `As per invoice ${number}`,
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

      if (received > 0) {
        await prisma.payment.create({
          data: {
            customerId,
            invoiceId: invoice.id,
            // The report gives the amount received, not when — recorded on the
            // invoice date so it lands in the right financial year.
            date,
            amount: received,
            mode: "NEFT",
            status: "RECEIVED",
            notes: "Amount received as per the Vyapar sale report; payment date not recorded there.",
            recordedById: admin.id,
          },
        });
        paymentsCreated++;
      }
    }
    console.log(`  FY ${fy}: ${rows.length} invoices`);
  }
  console.log(`  ${paymentsCreated} receipts recorded`);

  // --- Summary -----------------------------------------------------------------------
  const open = await prisma.invoice.findMany({
    where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
    orderBy: { date: "asc" },
    select: { number: true, date: true, total: true, amountPaid: true, customer: { select: { companyName: true } } },
  });
  console.log("\n→ Outstanding");
  let sum = 0;
  for (const i of open) {
    const bal = round2(Number(i.total) - Number(i.amountPaid));
    sum = round2(sum + bal);
    console.log(`  ${i.number.padEnd(20)} ${i.date.toISOString().slice(0, 10)}  ${bal.toFixed(2).padStart(12)}  ${i.customer.companyName}`);
  }
  console.log(`  ${"Total".padEnd(32)} ${sum.toFixed(2).padStart(12)}  (${open.length} invoices)`);
}

main()
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
