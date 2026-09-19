import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";
import type {
  AttendanceStatus,
  ExpenseCategory,
  LeaveType,
} from "../src/generated/prisma/enums";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function day(year: number, month: number, date: number): Date {
  return new Date(Date.UTC(year, month - 1, date));
}

function addDays(base: Date, count: number): Date {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + count);
  return next;
}

function atTime(date: Date, hours: number, minutes: number): Date {
  const result = new Date(date);
  result.setUTCHours(hours, minutes, 0, 0);
  return result;
}

function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const random = makeRandom(20260911);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]!;
}

function between(min: number, max: number): number {
  return Math.round(min + random() * (max - min));
}

const TODAY = new Date();
const THIS_YEAR = TODAY.getUTCFullYear();
const THIS_MONTH = TODAY.getUTCMonth() + 1;

const EMPLOYEES = [
  {
    code: "NTS-001",
    name: "Surjeet Singh",
    email: "surjeet@ntss.co.in",
    role: "ADMIN" as const,
    phone: "+91 89690 73557",
    designation: "Director",
    department: "Management",
    joined: day(2019, 4, 1),
    basic: 60000,
  },
  {
    code: "NTS-002",
    name: "Shankar M N",
    email: "shankar@ntss.co.in",
    role: "EMPLOYEE" as const,
    phone: "+91 90360 03236",
    designation: "Senior Service Engineer",
    department: "Service",
    joined: day(2021, 6, 14),
    basic: 32000,
  },
  {
    code: "NTS-003",
    name: "Ramesh Kumar",
    email: "ramesh@ntss.co.in",
    role: "EMPLOYEE" as const,
    phone: "+91 98450 11223",
    designation: "CNC Retrofitting Engineer",
    department: "Retrofitting",
    joined: day(2022, 1, 10),
    basic: 28000,
  },
  {
    code: "NTS-004",
    name: "Anitha Rao",
    email: "anitha@ntss.co.in",
    role: "EMPLOYEE" as const,
    phone: "+91 99019 44556",
    designation: "Accounts & Administration",
    department: "Accounts",
    joined: day(2023, 3, 6),
    basic: 24000,
  },
  {
    code: "NTS-005",
    name: "Imran Pasha",
    email: "imran@ntss.co.in",
    role: "EMPLOYEE" as const,
    phone: "+91 97400 77881",
    designation: "Automation Engineer",
    department: "Automation",
    joined: day(2024, 8, 19),
    basic: 26000,
  },
];

const CUSTOMERS = [
  {
    name: "Prakash Menon",
    company: "Yamazaki Mazak India Pvt Ltd",
    type: "ACTIVE" as const,
    city: "Pune",
    state: "Maharashtra",
    gstin: "27AABCY1234M1Z8",
    email: "service.india@mazak.example",
    phone: "+91 20 6712 3400",
  },
  {
    name: "Deepa Shetty",
    company: "Meril Life Sciences Pvt Ltd",
    type: "ACTIVE" as const,
    city: "Vapi",
    state: "Gujarat",
    gstin: "24AAECM4567K1ZP",
    email: "purchase@meril.example",
    phone: "+91 260 240 1100",
  },
  {
    name: "Vinod Kulkarni",
    company: "MultiTeck Engineering",
    type: "ACTIVE" as const,
    city: "Bengaluru",
    state: "Karnataka",
    gstin: "29AAFFM7788L1ZQ",
    email: "vinod@multiteck.example",
    phone: "+91 80 2839 4455",
  },
  {
    name: "Cdr. Rajiv Nair",
    company: "JRVD Defspace Technologies",
    type: "ACTIVE" as const,
    city: "Bengaluru",
    state: "Karnataka",
    gstin: "29AAJCJ2211N1ZR",
    email: "ops@jrvddefspace.example",
    phone: "+91 80 4123 8890",
  },
  {
    name: "Sunitha Reddy",
    company: "Niharika Aerospace Pvt Ltd",
    type: "ACTIVE" as const,
    city: "Hyderabad",
    state: "Telangana",
    gstin: "36AACCN9900P1ZS",
    email: "sunitha@niharikaaero.example",
    phone: "+91 40 2311 7788",
  },
  {
    name: "Girish Bhat",
    company: "San Engineering & Locomotive Co",
    type: "ACTIVE" as const,
    city: "Bengaluru",
    state: "Karnataka",
    gstin: "29AABCS3344Q1ZT",
    email: "maintenance@sanengg.example",
    phone: "+91 80 2222 3311",
  },
  {
    name: "Mohan Das",
    company: "Wendt India Ltd",
    type: "ACTIVE" as const,
    city: "Hosur",
    state: "Tamil Nadu",
    gstin: "33AAACW5566R1ZU",
    email: "plant@wendtindia.example",
    phone: "+91 4344 405 500",
  },
  {
    name: "Harpreet Kaur",
    company: "GI Auto Parts Pvt Ltd",
    type: "LEAD" as const,
    city: "Ludhiana",
    state: "Punjab",
    gstin: "03AADCG7799S1ZV",
    email: "harpreet@giautoparts.example",
    phone: "+91 161 250 6600",
  },
  {
    name: "Ravi Shankar",
    company: "Ripple Technology Solutions",
    type: "LEAD" as const,
    city: "Chennai",
    state: "Tamil Nadu",
    gstin: null,
    email: "ravi@rippletech.example",
    phone: "+91 44 4210 9900",
  },
  {
    name: "Nandini Iyer",
    company: "PMI Exports",
    type: "INACTIVE" as const,
    city: "Coimbatore",
    state: "Tamil Nadu",
    gstin: "33AAGFP1122T1ZW",
    email: "nandini@pmiexports.example",
    phone: "+91 422 267 3300",
  },
  {
    name: "Rakesh Kumar",
    company: "R K Machinery Spares",
    type: "VENDOR" as const,
    city: "Bengaluru",
    state: "Karnataka",
    gstin: "29AACFR8899U1ZX",
    email: "sales@rkmachinery.example",
    phone: "+91 80 2670 1122",
  },
  {
    name: "Sudhir Jain",
    company: "Vinayaka Enterprises",
    type: "VENDOR" as const,
    city: "Bengaluru",
    state: "Karnataka",
    gstin: "29AAJFV4455V1ZY",
    email: "orders@vinayakaent.example",
    phone: "+91 80 2345 9900",
  },
];

const SERVICE_LINES = [
  { description: "Spindle rebuild and dynamic balancing — Mazak QT-200", hsn: "998717", unit: "Job", rate: 78000 },
  { description: "CNC preventive maintenance visit (8 hours on site)", hsn: "998717", unit: "Visit", rate: 12500 },
  { description: "Ball screw replacement including alignment", hsn: "998717", unit: "Job", rate: 46500 },
  { description: "Fanuc servo drive repair and parameter restoration", hsn: "998717", unit: "Job", rate: 34000 },
  { description: "Retrofit — Siemens 828D controller upgrade", hsn: "998717", unit: "Job", rate: 425000 },
  { description: "Geometric accuracy calibration with laser interferometer", hsn: "998717", unit: "Job", rate: 28000 },
  { description: "Mitsubishi encoder battery pack (set of 4)", hsn: "854810", unit: "Set", rate: 4800 },
  { description: "Linear guideway block — THK HSR35 replacement", hsn: "848299", unit: "Nos", rate: 18600 },
  { description: "Hydraulic power pack overhaul", hsn: "998717", unit: "Job", rate: 39500 },
  { description: "Robot interfacing and PLC integration — 6-axis loader", hsn: "998717", unit: "Job", rate: 168000 },
];

const WORK_TASKS = [
  "Preventive maintenance — spindle and way lube inspection",
  "Attended breakdown call, replaced faulty proximity switch",
  "Retrofit wiring and cabinet layout for controller upgrade",
  "Geometric alignment check and report preparation",
  "Servo tuning and backlash compensation",
  "Commissioning support and operator handover training",
  "Spindle removal, bearing inspection and re-assembly",
  "PLC ladder modification for auto door interlock",
  "Coolant system flush and pump replacement",
  "Site survey and measurement for automation cell",
];

const HOLIDAYS_2026 = [
  { date: day(2026, 1, 1), name: "New Year's Day" },
  { date: day(2026, 1, 26), name: "Republic Day" },
  { date: day(2026, 3, 21), name: "Ugadi" },
  { date: day(2026, 4, 14), name: "Dr. Ambedkar Jayanti" },
  { date: day(2026, 5, 1), name: "May Day" },
  { date: day(2026, 8, 15), name: "Independence Day" },
  { date: day(2026, 10, 2), name: "Gandhi Jayanti" },
  { date: day(2026, 10, 20), name: "Ayudha Puja" },
  { date: day(2026, 11, 8), name: "Deepavali" },
  { date: day(2026, 12, 25), name: "Christmas Day" },
];

async function main() {
  console.log("→ Seeding Nutan Tech Solutions");

  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.task.deleteMany(),
    prisma.document.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.quotationItem.deleteMany(),
    prisma.quotation.deleteMany(),
    prisma.purchaseOrderItem.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.dailyWorkLog.deleteMany(),
    prisma.payslip.deleteMany(),
    prisma.payrollRun.deleteMany(),
    prisma.leaveRequest.deleteMany(),
    prisma.leaveBalance.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.salaryStructure.deleteMany(),
    prisma.customer.deleteMany(),
  ]);

  await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      name: "Nutan Tech Solutions",
      tagline: "Precision Restored, Performance Assured",
      email: "sales@ntss.co.in",
      phone: "+91 89690 73557",
      website: "https://ntss.co.in",
      logoUrl: "/brand/nts-logo.png",
      addressLine1: "Flat No. 24108, Prestige Jindal City",
      addressLine2: "Tumkur Main Road, 7th Cross, Manjunatha Nagar, Bagalakunte",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560073",
      country: "India",
      gstin: "29BRMPS5212E2ZK",
      pan: "BRMPS5212E",
      bankName: "HDFC Bank",
      bankAccountNo: "50200096556893",
      bankIfsc: "HDFC0004367",
      bankBranch: "HRBR Layout, Bangalore 560043",
      invoicesPrefix: "NTS/INV/",
      quotationPrefix: "NTS/QT/",
      purchaseOrderPrefix: "NTS/PO/",
      currency: "INR",
      defaultTaxRate: 18,
      homeState: "Karnataka",
    },
  });
  console.log("  ✓ company settings");

  for (const holiday of HOLIDAYS_2026) {
    await prisma.holiday.upsert({
      where: { date: holiday.date },
      update: { name: holiday.name },
      create: holiday,
    });
  }
  console.log(`  ✓ ${HOLIDAYS_2026.length} holidays`);

  const adminPassword = await bcrypt.hash("NtsAdmin@2026", 12);
  const staffPassword = await bcrypt.hash("NtsStaff@2026", 12);

  const users = [];

  for (const employee of EMPLOYEES) {
    const user = await prisma.user.upsert({
      where: { email: employee.email },
      update: {
        name: employee.name,
        phone: employee.phone,
        role: employee.role,
        status: "ACTIVE",
      },
      create: {
        employeeCode: employee.code,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        role: employee.role,
        status: "ACTIVE",
        passwordHash:
          employee.role === "ADMIN" ? adminPassword : staffPassword,
      },
    });

    await prisma.employeeProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        designation: employee.designation,
        department: employee.department,
        employmentType: "FULL_TIME",
        dateOfJoining: employee.joined,
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560073",
        bankName: "HDFC Bank",
        bankIfsc: "HDFC0004367",
        bankHolderName: employee.name,
      },
    });

    await prisma.salaryStructure.create({
      data: {
        userId: user.id,
        effectiveFrom: employee.joined,
        basic: employee.basic,
        hra: Math.round(employee.basic * 0.4),
        conveyance: 1600,
        medical: 1250,
        specialAllowance: Math.round(employee.basic * 0.15),
        pfDeduction: Math.min(1800, Math.round(employee.basic * 0.12)),
        professionalTax: 200,
      },
    });

    const entitlements: [LeaveType, number][] = [
      ["CASUAL", 12],
      ["SICK", 8],
      ["EARNED", 15],
    ];

    for (const [type, allocated] of entitlements) {
      await prisma.leaveBalance.create({
        data: { userId: user.id, year: THIS_YEAR, type, allocated, used: 0 },
      });
    }

    users.push({ ...user, meta: employee });
  }

  const admin = users.find((user) => user.role === "ADMIN")!;
  const staff = users.filter((user) => user.role === "EMPLOYEE");
  console.log(`  ✓ ${users.length} employees with salary structures`);

  const customers = [];

  for (const customer of CUSTOMERS) {
    const record = await prisma.customer.create({
      data: {
        name: customer.name,
        companyName: customer.company,
        type: customer.type,
        email: customer.email,
        phone: customer.phone,
        gstin: customer.gstin,
        addressLine1: `Plot ${between(10, 240)}, Industrial Area`,
        city: customer.city,
        state: customer.state,
        postalCode: String(between(110001, 690001)),
        country: "India",
        createdById: admin.id,
        ownerId: pick(users).id,
      },
    });
    customers.push(record);
  }

  const clients = customers.filter((c) => c.type !== "VENDOR");
  const vendors = customers.filter((c) => c.type === "VENDOR");
  console.log(`  ✓ ${customers.length} customers (${vendors.length} vendors)`);

  const holidayKeys = new Set(
    HOLIDAYS_2026.map((h) => h.date.toISOString().slice(0, 10)),
  );

  let attendanceCount = 0;
  let workLogCount = 0;
  let expenseCount = 0;

  const rangeStart = day(THIS_YEAR, THIS_MONTH, 1);
  rangeStart.setUTCMonth(rangeStart.getUTCMonth() - 2);

  for (const user of users) {
    const cursor = new Date(rangeStart);

    while (cursor <= TODAY) {
      const key = cursor.toISOString().slice(0, 10);
      const isSunday = cursor.getUTCDay() === 0;
      const isHoliday = holidayKeys.has(key);

      let status: AttendanceStatus;
      if (isSunday) status = "WEEK_OFF";
      else if (isHoliday) status = "HOLIDAY";
      else {
        const roll = random();
        status = roll > 0.94 ? "ABSENT" : roll > 0.9 ? "HALF_DAY" : "PRESENT";
      }

      const worked = status === "PRESENT" ? between(480, 585) : status === "HALF_DAY" ? between(220, 260) : 0;
      const checkIn = status === "PRESENT" || status === "HALF_DAY"
        ? atTime(cursor, 9, between(0, 25))
        : null;

      await prisma.attendance.create({
        data: {
          userId: user.id,
          date: new Date(cursor),
          status,
          checkInAt: checkIn,
          checkOutAt: checkIn ? new Date(checkIn.getTime() + worked * 60_000) : null,
          workedMinutes: worked,
          source: "SELF_CHECK_IN",
        },
      });
      attendanceCount++;

      if ((status === "PRESENT" || status === "HALF_DAY") && random() > 0.25) {
        const workLog = await prisma.dailyWorkLog.create({
          data: {
            userId: user.id,
            date: new Date(cursor),
            title: pick(WORK_TASKS),
            description:
              "Attended site as scheduled. Carried out the planned activity, verified machine operation after completion and handed over to the shift in-charge. Observations recorded in the service report.",
            hoursSpent: status === "HALF_DAY" ? 4 : between(6, 9),
            customerId: random() > 0.2 ? pick(clients).id : null,
            status: random() > 0.25 ? "APPROVED" : "SUBMITTED",
            reviewedById: random() > 0.25 ? admin.id : null,
            reviewedAt: random() > 0.25 ? addDays(cursor, 1) : null,
          },
        });
        workLogCount++;

        if (random() > 0.68) {
          const category = pick([
            "TRAVEL",
            "FUEL",
            "FOOD",
            "COURIER",
          ] as const) as ExpenseCategory;

          await prisma.expense.create({
            data: {
              userId: user.id,
              date: new Date(cursor),
              category,
              amount: between(180, 2400),
              description:
                category === "TRAVEL"
                  ? "Cab to customer site and return"
                  : category === "FUEL"
                    ? "Fuel for site visit"
                    : category === "FOOD"
                      ? "Meal during extended shift"
                      : "Courier charges for spare dispatch",
              workLogId: workLog.id,
              status: random() > 0.3 ? "APPROVED" : "PENDING",
              reviewedById: random() > 0.3 ? admin.id : null,
            },
          });
          expenseCount++;
        }
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  console.log(
    `  ✓ ${attendanceCount} attendance records, ${workLogCount} work logs, ${expenseCount} expenses`,
  );

  const leaveTypes: LeaveType[] = ["CASUAL", "SICK", "EARNED"];
  let leaveCount = 0;

  for (const user of staff) {
    for (let index = 0; index < 3; index++) {
      const start = addDays(rangeStart, between(5, 80));
      const length = between(1, 3);
      const status =
        index === 0 ? "PENDING" : random() > 0.25 ? "APPROVED" : "REJECTED";

      await prisma.leaveRequest.create({
        data: {
          userId: user.id,
          type: pick(leaveTypes),
          startDate: start,
          endDate: addDays(start, length - 1),
          days: length,
          reason: pick([
            "Family function at native place.",
            "Not keeping well, advised rest by the doctor.",
            "Personal work that cannot be rescheduled.",
            "Attending a relative's wedding.",
          ]),
          status,
          reviewedById: status === "PENDING" ? null : admin.id,
          reviewedAt: status === "PENDING" ? null : addDays(start, -2),
          reviewNote:
            status === "REJECTED"
              ? "Two engineers already on leave that week — please re-plan."
              : null,
        },
      });
      leaveCount++;
    }
  }
  console.log(`  ✓ ${leaveCount} leave requests`);

  const financialYear = (() => {
    const month = TODAY.getUTCMonth();
    const startYear = month >= 3 ? THIS_YEAR : THIS_YEAR - 1;
    return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
  })();

  function buildLines(count: number) {
    const lines = [];
    for (let index = 0; index < count; index++) {
      const service = pick(SERVICE_LINES);
      const quantity = service.unit === "Job" ? 1 : between(1, 4);
      lines.push({
        position: index,
        description: service.description,
        hsnCode: service.hsn,
        quantity,
        unit: service.unit,
        unitPrice: service.rate,
        taxRate: 18,
        lineTotal: quantity * service.rate,
      });
    }
    return lines;
  }

  function totalsFor(
    lines: { lineTotal: number; taxRate: number }[],
    state: string | null,
  ) {
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const intraState = (state ?? "Karnataka").toLowerCase() === "karnataka";
    const tax = Math.round(subtotal * 0.18 * 100) / 100;
    const half = Math.round((tax / 2) * 100) / 100;

    return {
      subtotal,
      discountAmount: 0,
      taxableAmount: subtotal,
      cgstAmount: intraState ? half : 0,
      sgstAmount: intraState ? tax - half : 0,
      igstAmount: intraState ? 0 : tax,
      total: subtotal + tax,
    };
  }

  let quotationSeq = 0;
  const quotations = [];

  for (const customer of clients) {
    const count = customer.type === "ACTIVE" ? 2 : 1;

    for (let index = 0; index < count; index++) {
      quotationSeq++;
      const date = addDays(rangeStart, between(0, 70));
      const lines = buildLines(between(1, 3));
      const totals = totalsFor(lines, customer.state);

      const quotation = await prisma.quotation.create({
        data: {
          number: `NTS/QT/${financialYear}/${quotationSeq}`,
          customerId: customer.id,
          date,
          validUntil: addDays(date, 30),
          status: pick(["DRAFT", "SENT", "ACCEPTED", "REJECTED"] as const),
          subject: "Quotation for CNC service and spares",
          placeOfSupply: customer.state,
          terms:
            "Payment: 50% advance, balance on completion. Delivery: 2–3 weeks from receipt of order. Warranty: 6 months on workmanship.",
          ...totals,
          createdById: pick(users).id,
          items: { create: lines },
        },
      });
      quotations.push(quotation);
    }
  }
  console.log(`  ✓ ${quotations.length} quotations`);

  let invoiceSeq = 0;
  const invoices = [];

  for (const quotation of quotations.filter((q) => q.status === "ACCEPTED")) {
    invoiceSeq++;
    const customer = clients.find((c) => c.id === quotation.customerId)!;
    const date = addDays(quotation.date, between(3, 20));
    const lines = buildLines(between(1, 3));
    const totals = totalsFor(lines, customer.state);

    const invoice = await prisma.invoice.create({
      data: {
        number: `NTS/INV/${financialYear}/${invoiceSeq}`,
        customerId: customer.id,
        quotationId: quotation.id,
        date,
        dueDate: addDays(date, 30),
        status: "SENT",
        subject: "Tax invoice for services rendered",
        placeOfSupply: customer.state,
        terms: "Payment due within 30 days. Interest at 18% p.a. on delayed payments.",
        ...totals,
        amountPaid: 0,
        createdById: admin.id,
        items: { create: lines },
      },
    });
    invoices.push(invoice);
  }

  for (const customer of clients.filter((c) => c.type === "ACTIVE").slice(0, 4)) {
    invoiceSeq++;
    const date = addDays(rangeStart, between(10, 75));
    const lines = buildLines(between(1, 2));
    const totals = totalsFor(lines, customer.state);

    const invoice = await prisma.invoice.create({
      data: {
        number: `NTS/INV/${financialYear}/${invoiceSeq}`,
        customerId: customer.id,
        date,
        dueDate: addDays(date, 30),
        status: "SENT",
        subject: "Tax invoice — preventive maintenance",
        placeOfSupply: customer.state,
        ...totals,
        amountPaid: 0,
        createdById: admin.id,
        items: { create: lines },
      },
    });
    invoices.push(invoice);
  }
  console.log(`  ✓ ${invoices.length} invoices`);

  let paymentCount = 0;

  for (const invoice of invoices) {
    const roll = random();
    if (roll > 0.7) continue;

    const total = Number(invoice.total);
    const full = roll < 0.45;
    const amount = full ? total : Math.round(total * 0.5 * 100) / 100;
    const paidOn = addDays(invoice.date, between(5, 40));

    await prisma.payment.create({
      data: {
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        date: paidOn > TODAY ? TODAY : paidOn,
        amount,
        mode: pick(["NEFT", "RTGS", "UPI", "CHEQUE"] as const),
        status: "RECEIVED",
        reference: `UTR${between(100000000, 999999999)}`,
        recordedById: admin.id,
      },
    });
    paymentCount++;

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: amount,
        status: full ? "PAID" : "PARTIALLY_PAID",
      },
    });
  }

  await prisma.invoice.updateMany({
    where: { dueDate: { lt: TODAY }, status: { in: ["SENT", "PARTIALLY_PAID"] } },
    data: { status: "OVERDUE" },
  });
  console.log(`  ✓ ${paymentCount} payments`);

  let poSeq = 0;

  for (const vendor of vendors) {
    for (let index = 0; index < 2; index++) {
      poSeq++;
      const date = addDays(rangeStart, between(5, 70));
      const lines = buildLines(between(1, 3));
      const totals = totalsFor(lines, vendor.state);

      await prisma.purchaseOrder.create({
        data: {
          number: `NTS/PO/${financialYear}/${poSeq}`,
          vendorId: vendor.id,
          date,
          expectedDate: addDays(date, 14),
          status: pick(["DRAFT", "SENT", "RECEIVED"] as const),
          placeOfSupply: vendor.state,
          subtotal: totals.subtotal,
          taxableAmount: totals.taxableAmount,
          cgstAmount: totals.cgstAmount,
          sgstAmount: totals.sgstAmount,
          igstAmount: totals.igstAmount,
          total: totals.total,
          createdById: admin.id,
          items: { create: lines },
        },
      });
    }
  }
  console.log(`  ✓ ${poSeq} purchase orders`);

  const payrollMonth = THIS_MONTH === 1 ? 12 : THIS_MONTH - 1;
  const payrollYear = THIS_MONTH === 1 ? THIS_YEAR - 1 : THIS_YEAR;

  const run = await prisma.payrollRun.create({
    data: {
      month: payrollMonth,
      year: payrollYear,
      status: "FINALIZED",
      createdById: admin.id,
      finalizedAt: TODAY,
      notes: "Regular monthly payroll.",
    },
  });

  const workingDays = 26;

  for (const user of users) {
    const structure = await prisma.salaryStructure.findFirst({
      where: { userId: user.id },
      orderBy: { effectiveFrom: "desc" },
    });
    if (!structure) continue;

    const basic = Number(structure.basic);
    const hra = Number(structure.hra);
    const conveyance = Number(structure.conveyance);
    const medical = Number(structure.medical);
    const special = Number(structure.specialAllowance);
    const pf = Number(structure.pfDeduction);
    const pt = Number(structure.professionalTax);

    const lopDays = random() > 0.7 ? 1 : 0;
    const fullMonth = basic + hra + conveyance + medical + special;
    const lopDeduction = Math.round((fullMonth / workingDays) * lopDays * 100) / 100;
    const reimbursements = between(0, 3500);

    const gross = fullMonth + reimbursements;
    const deductions = pf + pt + lopDeduction;

    await prisma.payslip.create({
      data: {
        payrollRunId: run.id,
        userId: user.id,
        month: payrollMonth,
        year: payrollYear,
        workingDays,
        presentDays: workingDays - lopDays,
        paidLeaveDays: 0,
        lopDays,
        basic,
        hra,
        conveyance,
        medical,
        specialAllowance: special,
        reimbursements,
        pfDeduction: pf,
        professionalTax: pt,
        lopDeduction,
        grossEarnings: gross,
        totalDeductions: deductions,
        netPay: Math.round((gross - deductions) * 100) / 100,
      },
    });
  }
  console.log(`  ✓ payroll run for ${payrollMonth}/${payrollYear}`);

  const TASKS = [
    {
      title: "Spindle vibration check — VMC 850",
      description:
        "Customer reports chatter above 6,000 rpm on the VMC 850. Run a vibration analysis on the spindle, check drawbar force and tool holder taper condition. Bring the vibration analyser and a set of test bars.",
      priority: "HIGH",
      status: "OPEN",
      dueOffset: 2,
    },
    {
      title: "Quarterly preventive maintenance",
      description:
        "Scheduled PM visit: way lube system check, coolant concentration, axis backlash measurement on X/Y/Z, filter replacement. Complete the PM checklist and get it signed by the shift supervisor.",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      dueOffset: 5,
    },
    {
      title: "Retrofit proposal — site survey",
      description:
        "Survey the two older lathes for a Fanuc control retrofit. Note existing control model, servo drive ratings, encoder types and cabinet space. Photograph the panel layout for the quotation.",
      priority: "URGENT",
      status: "OPEN",
      dueOffset: -1,
    },
    {
      title: "Collect signed service report",
      description:
        "Pick up the signed copy of last week's breakdown service report from the stores office so the invoice can be raised.",
      priority: "LOW",
      status: "COMPLETED",
      dueOffset: -3,
      completionNote: "Collected and handed to accounts.",
    },
  ] as const;

  for (const task of TASKS) {
    const assignee = pick(staff);
    const due = addDays(day(THIS_YEAR, THIS_MONTH, TODAY.getUTCDate()), task.dueOffset);
    const created = addDays(due, -between(3, 7));

    await prisma.task.create({
      data: {
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        dueDate: due,
        assigneeId: assignee.id,
        assignedById: admin.id,
        customerId: pick(clients).id,
        createdAt: created,
        startedAt:
          task.status === "IN_PROGRESS" || task.status === "COMPLETED"
            ? addDays(created, 1)
            : null,
        completedAt: task.status === "COMPLETED" ? addDays(created, 2) : null,
        completionNote:
          "completionNote" in task ? task.completionNote : null,
      },
    });

    if (task.status !== "COMPLETED") {
      await prisma.notification.create({
        data: {
          userId: assignee.id,
          type: "TASK_ASSIGNED",
          title: `${admin.name} assigned you a task`,
          body: task.title,
          link: "/tasks",
          createdAt: created,
        },
      });
    }
  }
  console.log(`  ✓ ${TASKS.length} tasks`);

  const pendingLeave = await prisma.leaveRequest.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { name: true } } },
  });

  for (const leave of pendingLeave) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: "LEAVE_SUBMITTED",
        title: `${leave.user.name} requested leave`,
        body: `${leave.days} day(s) of ${leave.type.toLowerCase()} leave awaiting your approval.`,
        link: "/admin/approvals",
      },
    });
  }

  for (const user of staff) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "PAYSLIP_READY",
        title: `Payslip for ${payrollMonth}/${payrollYear} is ready`,
        body: "Your payslip is available to view and download.",
        link: "/payslips",
      },
    });
  }
  console.log(`  ✓ notifications`);

  console.log("\n  Sign in with:");
  console.log("    Admin     surjeet@ntss.co.in  /  NtsAdmin@2026");
  console.log("    Employee  shankar@ntss.co.in  /  NtsStaff@2026");
  console.log("\n→ Done");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
