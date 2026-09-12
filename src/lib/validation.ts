import { z } from "zod";

/**
 * Zod schemas shared by Server Actions, Route Handlers, and (for field hints)
 * the client. Validation always runs on the server — the client never gets to
 * decide what is acceptable.
 */

// --- Primitives --------------------------------------------------------------

/** Trims, then rejects empty. HTML forms send "" rather than omitting a field. */
const requiredText = (label: string, max = 255) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

/** Optional text where "" from an untouched input should become undefined. */
const optionalText = (max = 255) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === "" ? undefined : value));

const optionalLongText = (max = 5000) => optionalText(max);

/** `<input type="date">` value. */
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

const optionalDateString = z
  .string()
  .optional()
  .transform((value) => (value === "" ? undefined : value))
  .refine(
    (value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Enter a valid date.",
  );

/** Numeric form field: arrives as a string, must end up a finite number. */
const numeric = (label: string, options: { min?: number; max?: number } = {}) =>
  z
    .union([z.string(), z.number()])
    .transform((value) => (typeof value === "number" ? value : value.trim()))
    .refine((value) => value !== "" && Number.isFinite(Number(value)), {
      message: `${label} must be a number.`,
    })
    .transform((value) => Number(value))
    .refine((value) => options.min === undefined || value >= options.min, {
      message: `${label} must be at least ${options.min}.`,
    })
    .refine((value) => options.max === undefined || value <= options.max, {
      message: `${label} must be at most ${options.max}.`,
    });

const optionalNumeric = (label: string, fallback = 0) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === "") return fallback;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    })
    .refine((value) => Number.isFinite(value), `${label} must be a number.`);

/** HTML checkboxes submit "on" when ticked and nothing when not. */
const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
  .optional()
  .transform((value) => value === "on" || value === "true" || value === true);

export const emailField = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .email("Enter a valid email address.")
  .toLowerCase();

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? undefined : value?.toLowerCase()))
  .refine(
    (value) => value === undefined || z.string().email().safeParse(value).success,
    "Enter a valid email address.",
  );

/** Indian mobile / landline, tolerant of +91, spaces, and hyphens. */
const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? undefined : value))
  .refine(
    (value) => value === undefined || /^[+\d][\d\s\-()]{6,19}$/.test(value),
    "Enter a valid phone number.",
  );

const optionalGstin = z
  .string()
  .trim()
  .toUpperCase()
  .optional()
  .transform((value) => (value === "" ? undefined : value))
  .refine(
    (value) =>
      value === undefined ||
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value),
    "Enter a valid 15-character GSTIN.",
  );

const optionalPan = z
  .string()
  .trim()
  .toUpperCase()
  .optional()
  .transform((value) => (value === "" ? undefined : value))
  .refine(
    (value) => value === undefined || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value),
    "Enter a valid 10-character PAN.",
  );

export const cuid = z.string().min(1, "A selection is required.");

const optionalCuid = z
  .string()
  .optional()
  .transform((value) => (value === "" ? undefined : value));

// --- Shared list/query -------------------------------------------------------

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(5).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

// --- Auth --------------------------------------------------------------------

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required.").max(200),
});

/**
 * Password policy for anything a user sets themselves. Length does the heavy
 * lifting; the character classes stop the obvious "password1" choices.
 */
export const passwordField = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(200, "That password is too long.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "The two passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Choose a password you have not used before.",
    path: ["newPassword"],
  });

// --- Employees ---------------------------------------------------------------

export const employeeCreateSchema = z.object({
  name: requiredText("Name", 120),
  email: emailField,
  phone: optionalPhone,
  role: z.enum(["ADMIN", "EMPLOYEE"]).default("EMPLOYEE"),
  password: passwordField,
  designation: optionalText(120),
  department: optionalText(120),
  employmentType: z
    .enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"])
    .default("FULL_TIME"),
  dateOfJoining: optionalDateString,
});

export const employeeUpdateSchema = z.object({
  id: cuid,
  name: requiredText("Name", 120),
  email: emailField,
  phone: optionalPhone,
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
  designation: optionalText(120),
  department: optionalText(120),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]),
  dateOfJoining: optionalDateString,
  dateOfBirth: optionalDateString,
  gender: optionalText(30),
  bloodGroup: optionalText(10),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(100),
  state: optionalText(100),
  postalCode: optionalText(20),
  emergencyContactName: optionalText(120),
  emergencyContactPhone: optionalPhone,
  panNumber: optionalPan,
  aadhaarNumber: optionalText(20),
  uanNumber: optionalText(30),
  bankName: optionalText(120),
  bankAccountNo: optionalText(40),
  bankIfsc: optionalText(20),
  bankHolderName: optionalText(120),
});

/** The fields an employee may change on their own profile. */
export const ownProfileSchema = z.object({
  name: requiredText("Name", 120),
  phone: optionalPhone,
  dateOfBirth: optionalDateString,
  gender: optionalText(30),
  bloodGroup: optionalText(10),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(100),
  state: optionalText(100),
  postalCode: optionalText(20),
  emergencyContactName: optionalText(120),
  emergencyContactPhone: optionalPhone,
  bankName: optionalText(120),
  bankAccountNo: optionalText(40),
  bankIfsc: optionalText(20),
  bankHolderName: optionalText(120),
});

export const salaryStructureSchema = z.object({
  userId: cuid,
  effectiveFrom: dateString,
  basic: numeric("Basic", { min: 0 }),
  hra: optionalNumeric("HRA"),
  conveyance: optionalNumeric("Conveyance"),
  medical: optionalNumeric("Medical"),
  specialAllowance: optionalNumeric("Special allowance"),
  otherAllowance: optionalNumeric("Other allowance"),
  pfDeduction: optionalNumeric("PF"),
  esiDeduction: optionalNumeric("ESI"),
  professionalTax: optionalNumeric("Professional tax"),
  tdsDeduction: optionalNumeric("TDS"),
  otherDeduction: optionalNumeric("Other deduction"),
  notes: optionalLongText(500),
});

// --- Attendance --------------------------------------------------------------

export const attendanceMarkSchema = z.object({
  userId: cuid,
  date: dateString,
  status: z.enum([
    "PRESENT",
    "ABSENT",
    "HALF_DAY",
    "ON_LEAVE",
    "HOLIDAY",
    "WEEK_OFF",
  ]),
  checkInAt: optionalText(10),
  checkOutAt: optionalText(10),
  notes: optionalText(500),
});

// --- Leave -------------------------------------------------------------------

export const leaveRequestSchema = z
  .object({
    type: z.enum([
      "CASUAL",
      "SICK",
      "EARNED",
      "UNPAID",
      "COMP_OFF",
      "MATERNITY",
    ]),
    startDate: dateString,
    endDate: dateString,
    halfDay: checkbox,
    reason: requiredText("Reason", 1000),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "The end date cannot be before the start date.",
    path: ["endDate"],
  })
  .refine((data) => !data.halfDay || data.startDate === data.endDate, {
    message: "A half day must start and end on the same date.",
    path: ["halfDay"],
  });

export const leaveReviewSchema = z.object({
  id: cuid,
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: optionalText(500),
});

export const leaveBalanceSchema = z.object({
  userId: cuid,
  year: z.coerce.number().int().min(2000).max(2100),
  type: z.enum(["CASUAL", "SICK", "EARNED", "UNPAID", "COMP_OFF", "MATERNITY"]),
  allocated: numeric("Allocated days", { min: 0, max: 365 }),
});

// --- Daily work & expenses ---------------------------------------------------

export const workLogSchema = z.object({
  id: optionalCuid,
  date: dateString,
  title: requiredText("Title", 160),
  description: requiredText("Description", 4000),
  hoursSpent: numeric("Hours", { min: 0.25, max: 24 }),
  customerId: optionalCuid,
});

export const workLogReviewSchema = z.object({
  id: cuid,
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: optionalText(500),
});

export const expenseSchema = z.object({
  id: optionalCuid,
  date: dateString,
  category: z.enum([
    "TRAVEL",
    "FUEL",
    "FOOD",
    "TOOLS",
    "MATERIAL",
    "LODGING",
    "COURIER",
    "OTHER",
  ]),
  amount: numeric("Amount", { min: 1, max: 1_000_000 }),
  description: requiredText("Description", 500),
  workLogId: optionalCuid,
  receiptUrl: optionalText(500),
});

export const expenseReviewSchema = z.object({
  id: cuid,
  decision: z.enum(["APPROVED", "REJECTED", "REIMBURSED"]),
  reviewNote: optionalText(500),
});

// --- Customers ---------------------------------------------------------------

export const customerSchema = z.object({
  id: optionalCuid,
  name: requiredText("Contact name", 160),
  companyName: optionalText(200),
  type: z.enum(["LEAD", "ACTIVE", "INACTIVE", "VENDOR"]).default("LEAD"),
  email: optionalEmail,
  phone: optionalPhone,
  altPhone: optionalPhone,
  website: optionalText(200),
  gstin: optionalGstin,
  pan: optionalPan,
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(100),
  state: optionalText(100),
  postalCode: optionalText(20),
  country: optionalText(100),
  notes: optionalLongText(2000),
  ownerId: optionalCuid,
});

// --- Line-item documents -----------------------------------------------------

/**
 * Line items arrive from the form as parallel arrays (`items.description[]`,
 * `items.quantity[]`, …). `zipLineItems` in `lib/line-items.ts` turns them back
 * into objects before this schema runs.
 */
export const lineItemSchema = z.object({
  description: requiredText("Description", 500),
  hsnCode: optionalText(20),
  quantity: numeric("Quantity", { min: 0.001, max: 1_000_000 }),
  unit: z.string().trim().max(20).default("Nos"),
  unitPrice: numeric("Rate", { min: 0, max: 100_000_000 }),
  taxRate: numeric("Tax %", { min: 0, max: 100 }),
});

const documentBase = {
  id: optionalCuid,
  customerId: cuid,
  date: dateString,
  subject: optionalText(200),
  notes: optionalLongText(2000),
  terms: optionalLongText(2000),
  placeOfSupply: optionalText(100),
  discountAmount: optionalNumeric("Discount"),
  items: z.array(lineItemSchema).min(1, "Add at least one line item."),
};

export const quotationSchema = z.object({
  ...documentBase,
  validUntil: optionalDateString,
  status: z
    .enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED"])
    .default("DRAFT"),
});

export const invoiceSchema = z.object({
  ...documentBase,
  dueDate: optionalDateString,
  quotationId: optionalCuid,
  status: z
    .enum([
      "DRAFT",
      "SENT",
      "PARTIALLY_PAID",
      "PAID",
      "OVERDUE",
      "CANCELLED",
    ])
    .default("DRAFT"),
});

export const purchaseOrderSchema = z.object({
  id: optionalCuid,
  vendorId: cuid,
  date: dateString,
  expectedDate: optionalDateString,
  status: z
    .enum(["DRAFT", "SENT", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"])
    .default("DRAFT"),
  notes: optionalLongText(2000),
  terms: optionalLongText(2000),
  placeOfSupply: optionalText(100),
  items: z.array(lineItemSchema).min(1, "Add at least one line item."),
});

// --- Payments ----------------------------------------------------------------

export const paymentSchema = z.object({
  id: optionalCuid,
  customerId: cuid,
  invoiceId: optionalCuid,
  date: dateString,
  amount: numeric("Amount", { min: 0.01, max: 100_000_000 }),
  mode: z
    .enum(["CASH", "UPI", "NEFT", "RTGS", "IMPS", "CHEQUE", "CARD", "OTHER"])
    .default("NEFT"),
  status: z
    .enum(["PENDING", "RECEIVED", "FAILED", "CANCELLED"])
    .default("RECEIVED"),
  reference: optionalText(120),
  notes: optionalLongText(1000),
});

// --- Payroll -----------------------------------------------------------------

export const payrollRunSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  notes: optionalLongText(1000),
});

export const payrollStatusSchema = z.object({
  id: cuid,
  status: z.enum(["DRAFT", "PROCESSING", "FINALIZED", "PAID"]),
});

// --- Settings ----------------------------------------------------------------

export const companySettingsSchema = z.object({
  name: requiredText("Company name", 200),
  tagline: optionalText(200),
  email: optionalEmail,
  phone: optionalPhone,
  website: optionalText(200),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(100),
  state: optionalText(100),
  postalCode: optionalText(20),
  country: optionalText(100),
  gstin: optionalGstin,
  pan: optionalPan,
  bankName: optionalText(120),
  bankAccountNo: optionalText(40),
  bankIfsc: optionalText(20),
  bankBranch: optionalText(120),
  upiId: optionalText(120),
  invoicesPrefix: requiredText("Invoice prefix", 30),
  quotationPrefix: requiredText("Quotation prefix", 30),
  purchaseOrderPrefix: requiredText("Purchase order prefix", 30),
  defaultTaxRate: numeric("Default tax rate", { min: 0, max: 100 }),
  homeState: requiredText("Home state", 100),
});

export const holidaySchema = z.object({
  date: dateString,
  name: requiredText("Holiday name", 120),
});

// --- Inferred types ----------------------------------------------------------

export type LoginInput = z.infer<typeof loginSchema>;
export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
export type SalaryStructureInput = z.infer<typeof salaryStructureSchema>;
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
export type WorkLogInput = z.infer<typeof workLogSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type QuotationInput = z.infer<typeof quotationSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type LineItemInput = z.infer<typeof lineItemSchema>;
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
