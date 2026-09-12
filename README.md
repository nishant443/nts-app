# Nutan Tech Solutions — Operations & HR Platform

Internal web application for **Nutan Tech Solutions**, Bengaluru — CNC machine
maintenance, retrofitting, automation and robotics.

It brings the business side (customers, quotations, invoices, payments,
purchase orders) and the people side (attendance, leave, daily work reports,
expenses, payroll and payslips) into one place, with a strict split between what
an administrator can see and what an employee can see.

---

## Contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Everyday commands](#everyday-commands)
- [Project structure](#project-structure)
- [Roles and access control](#roles-and-access-control)
- [Business rules worth knowing](#business-rules-worth-knowing)
- [Security](#security)
- [Performance](#performance)
- [Deployment](#deployment)
- [API reference](./docs/API.md)

---

## What it does

### Business operations

| Module | Notes |
| --- | --- |
| **Customers** | Clients, leads and vendors. GSTIN auto-fills the state, which decides IGST vs CGST/SGST. Both roles can add; only admins can edit. |
| **Quotations** | Line items with per-line GST slabs, validity dates, PDF export, email to the customer, and one-click conversion into an invoice. |
| **Invoices** | GST tax invoices with HSN/SAC codes, amount in words, bank details, and a PDF that matches the paper format NTS already uses. Emailable with the PDF attached. |
| **Payments** | Receipts against invoices or on account. `amountPaid` and invoice status are always recomputed from the payments behind them, inside a transaction. |
| **Purchase orders** | What NTS buys in, raised against a customer record marked as a vendor. |
| **Documents** | Certificates, purchase bills and ID proofs, filed against a customer or an employee. |

### HR

| Module | Notes |
| --- | --- |
| **Attendance** | Self check-in/out plus an admin register for corrections. Month calendar per employee; Sundays and declared holidays are implied, not stored. |
| **Leave** | Requests with balance tracking. Approving debits the balance *and* blocks out the calendar so payroll counts it as paid leave. |
| **Daily work** | What each engineer did, optionally linked to a customer, reviewed by an admin. |
| **Expenses** | Out-of-pocket claims with receipt upload, approved by an admin and folded into the next payslip. |
| **Payroll** | Monthly runs that compute working days, loss of pay and reimbursements, then publish downloadable payslips. |

### Cross-cutting

Role-aware dashboards, in-app notifications, global search (Ctrl/⌘-K), reports
with Excel export, and company settings including GST numbering and the holiday
calendar.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 16** (App Router, Turbopack, React 19) |
| Language | **TypeScript**, `strict` |
| Styling | **Tailwind CSS v4** with a brand palette taken from the NTS logo |
| Database | **PostgreSQL 17** via **Prisma 7** (query compiler + `@prisma/adapter-pg`) |
| Auth | Custom JWT sessions signed with **jose**, `httpOnly` cookies, bcrypt hashing |
| Validation | **Zod 4**, server-side on every form and endpoint |
| PDFs | **@react-pdf/renderer** — invoices, quotations, payslips |
| Spreadsheets | **ExcelJS** — sales, attendance and payroll registers |
| Charts | **Recharts**, lazy-loaded and client-only |

---

## Getting started

### Prerequisites

- **Node.js 20.9+** (developed on 24 LTS)
- **PostgreSQL 14+** running locally, or a hosted database (Neon, Supabase, Render)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure the environment
cp .env.example .env
#    then set DATABASE_URL and SESSION_SECRET (see below)

# 3. Create the schema
npm run db:deploy      # or: npm run db:migrate   (development)

# 4. Load sample data
npm run db:seed

# 5. Start
npm run dev
```

Open <http://localhost:3000>.

### Sample accounts

Created by `npm run db:seed` — change these before any real use.

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `surjeet@ntss.co.in` | `NtsAdmin@2026` |
| Employee | `shankar@ntss.co.in` | `NtsStaff@2026` |

The seed also loads the real company registration details, twelve customers
drawn from the machine-tool sector, and roughly three months of attendance,
work reports, expenses, quotations, invoices and payments — enough for every
screen to show something meaningful.

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string. Add `?sslmode=require` for hosted databases. |
| `SESSION_SECRET` | yes | Signs the session JWT. **32+ characters.** Rotating it signs everybody out. |
| `SHADOW_DATABASE_URL` | dev only | Throwaway database `prisma migrate dev` uses to replay the migration history. Not needed on hosted Postgres. |
| `NEXT_PUBLIC_APP_URL` | no | Absolute URL of the app. Defaults to `http://localhost:3000`. |
| `STORAGE_DRIVER` | no | `local` (default) or `cloudinary`. |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | if cloudinary | Required together when `STORAGE_DRIVER=cloudinary`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | no | Outbound email. Leave `SMTP_HOST` blank and the **Email** buttons on quotations and invoices explain that mail is not set up instead of failing. Gmail works with an app password: host `smtp.gmail.com`, port `465`, secure `true`. |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

The environment is parsed and validated once at startup (`src/lib/env.ts`), so a
misconfigured deployment fails immediately rather than at the first request.

> **`STORAGE_DRIVER=local` writes to `./storage`, which is not durable on
> serverless hosts.** Use Cloudinary (or another object store) in production.

---

## Everyday commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run verify` | Typecheck + lint + calculation checks — run this before committing |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run check` | Business-rule checks (GST, payroll, dates, form encoding) |
| `npm run db:migrate` | Create and apply a migration (development) |
| `npm run db:deploy` | Apply existing migrations (production) |
| `npm run db:seed` | Load sample data — **clears transactional tables first** |
| `npm run db:studio` | Prisma Studio |
| `npm run db:generate` | Regenerate the Prisma client after a schema change |

### Calculation checks

`npm run check` exercises the arithmetic where a quiet error would be expensive:
GST splitting and discount apportionment, loss-of-pay, amount-in-words, the
April–March financial year, and the line-item form encoding. No database or
running server needed — every function under test is pure.

---

## Project structure

```
prisma/
  schema.prisma          Data model
  migrations/            Tracked migration history
  seed.ts                Sample data

scripts/
  check-calculations.ts  Business-rule checks

src/
  app/
    (app)/               Authenticated pages — share the app shell
      dashboard/         Role-aware landing page
      customers/  quotations/  invoices/  payments/  purchase-orders/
      attendance/ leave/ work-logs/ expenses/ payslips/
      documents/  notifications/  reports/  settings/
      admin/             Admin-only: employees, attendance register,
                         approvals, payroll
    actions/             Server Actions, grouped by domain
    api/                 Route handlers — PDFs, exports, search, uploads, files
    login/               Sign-in

  components/
    brand/               Logo and monogram
    layout/              Shell, navigation, search, theme, user menu
    ui/                  Design system — button, field, card, table, badge…
    documents/           Line-item editor, document view, status controls
    <domain>/            Feature-specific components

  lib/
    dal.ts               Data Access Layer — every authorization decision
    session.ts           JWT encode/decode and cookie handling
    api.ts / action.ts   Route Handler and Server Action wrappers
    validation.ts        Zod schemas for every form and endpoint
    tax.ts               GST computation
    payroll-math.ts      Pure payroll arithmetic
    payroll.ts           Payroll data access
    money.ts / dates.ts  Formatting and calendar helpers
    pdf/ excel.ts        Document and spreadsheet generation
    services/            Query aggregation per domain

  proxy.ts               Security headers + optimistic auth redirect
```

### Conventions

- **Money** lives in Postgres as `Decimal(14,2)`. Prisma returns `Decimal`
  objects, which cannot cross to a Client Component — always map them with
  `toMoney()` first.
- **Calendar days** are stored at UTC midnight, so a date means the same day
  regardless of the server's timezone. Build them with `toDayStart()` / `dayKey()`.
- **List pages take their state from the URL** (`?q=&status=&page=`). They stay
  Server Components, and a filtered view is shareable.
- **Client Components must not import from `lib/action.ts`** — it pulls in the
  whole server chain. Import `FormState` from `lib/form-state.ts` instead.

---

## Roles and access control

There are exactly two roles.

**Employee** — their own attendance, leave, work reports, expenses and payslips;
customers they can add and view; quotations; invoices and payments *limited to
the ones they raised or that belong to customers they own*.

**Administrator** — everything above, plus employee management, approvals,
payroll, reports, company settings, and every company-wide financial figure.

### How it is enforced

Four layers, of which only the last three are load-bearing:

1. **Navigation** hides admin links (`navForRole`). Cosmetic only.
2. **`src/proxy.ts`** does an optimistic cookie check and redirects signed-out
   visitors. A convenience, explicitly *not* a security boundary.
3. **The Data Access Layer** (`src/lib/dal.ts`) re-reads the user from the
   database on every request and checks `status` and `sessionVersion`, so a
   deactivated account or a changed password takes effect on the next request
   rather than whenever the JWT expires.
4. **Every page, action and endpoint** calls `requireUser()` / `requireAdmin()`
   (pages) or `requireApiUser()` / `requireApiAdmin()` (API and actions) before
   touching data. Role is a *required argument* to `withRoute()` and
   `formAction()`, so an endpoint cannot forget to declare it.

Company-wide money is handled by separation, not by hiding: `getAdminDashboard()`
and `getEmployeeDashboard()` are different functions, and the employee one never
issues the revenue queries at all. The figures cannot leak through an
over-fetched prop or the RSC payload because they are never fetched.

---

## Business rules worth knowing

**GST.** A supply inside the company's home state (Karnataka) is CGST + SGST at
half the rate each; anywhere else is IGST at the full rate. Place of supply comes
from the customer's state, which is itself derived from their GSTIN. A
document-level discount is apportioned across lines in proportion to their value,
so each tax slab reports the right taxable amount. CGST and SGST are split after
rounding so they always sum to exactly the total tax.

**Document numbers** follow the format NTS already uses on paper —
`NTS/INV/26-27/28` — where `26-27` is the Indian financial year (April–March) and
the sequence resets each April. Numbers are allocated inside the same transaction
as the insert, with a unique constraint and a retry as the backstop.

**Payroll.** Working days are calendar days minus Sundays and declared holidays.
Paid days are attendance marked present (1) or half day (0.5), plus approved
leave from a paid leave type. Loss of pay is the shortfall, charged at
`gross ÷ working days`. Approved expenses are added to gross as a pass-through
and are never scaled by attendance. Once a run is finalized the figures are
frozen — that is what employees were shown and what the bank transfer was based on.

**Invoice status** is derived, not set by hand. `Draft` and `Cancelled` are
deliberate choices; `Sent`, `Partially paid`, `Paid` and `Overdue` all follow
from the payments recorded and the due date. An invoice cannot be edited below
what has already been received against it.

---

## Security

- **Sessions** — HS256 JWT in an `httpOnly`, `SameSite=Lax` cookie, `Secure` in
  production, eight-hour expiry. Claims are minimal: user id, role, session
  version.
- **Passwords** — bcrypt, cost 12. A failed login for an unknown email still
  performs a bcrypt comparison so response time does not reveal whether the
  address exists. Minimum ten characters with mixed case and a digit.
- **Session invalidation** — `sessionVersion` is bumped on password change,
  admin reset and deactivation, invalidating every token already issued.
- **Rate limiting** — per-account where possible, per-IP otherwise. Login is
  limited by email *and* by IP. In-process and therefore per-instance; swap
  `hit()` in `src/lib/rate-limit.ts` for a Redis `INCR`/`EXPIRE` before scaling out.
- **Input validation** — Zod on the server for every form and endpoint. Line
  items are re-validated and every total is recomputed server-side; the amounts
  the browser displayed are never persisted.
- **SQL injection** — Prisma parameterises everything; no raw SQL in the app.
- **Headers** — CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, and HSTS in production (`src/proxy.ts`).
- **Uploads** — validated by magic bytes as well as extension, so a renamed
  executable cannot be stored as a "receipt". Locally stored files live outside
  `public/` and are served through an authenticated route.
- **Audit trail** — every change to money, pay or access is recorded in
  `audit_logs` with a hashed IP.

### Before going live

1. Change both seeded passwords, or delete the sample accounts entirely.
2. Set a fresh `SESSION_SECRET`.
3. Switch `STORAGE_DRIVER` to `cloudinary` (local disk is not durable).
4. Point rate limiting at Redis if you run more than one instance.

---

## Performance

- Pages are Server Components by default; only genuinely interactive pieces are
  client-side. Filters and pagination live in the URL, so lists ship no
  hydration cost.
- Lists are paginated at the database, never fetched whole.
- Recharts is loaded through `next/dynamic` with `ssr: false`, keeping it off
  the dashboard's critical path. `optimizePackageImports` tree-shakes the icon
  and date-fns barrels.
- `loading.tsx` skeletons reserve the real layout's footprint, so cumulative
  layout shift stays at zero.
- Indexes cover every column the app filters on: `userId + date` for attendance
  and work logs, `status + date` for documents, plus customer, invoice and due
  date lookups.
- Wide tables scroll inside their own container — `overflow-x: clip` on `html`
  and `body`, plus `min-w-0` on every flex and grid child, means **the page
  itself never scrolls sideways at any width**.

---

## Deployment

Any Node host works. On **Vercel**:

1. Import the repository.
2. Set the environment variables above (`SHADOW_DATABASE_URL` is not needed).
3. Provision Postgres — Neon, Supabase and Vercel Postgres all work; append
   `?sslmode=require`.
4. Set the build command to `prisma generate && prisma migrate deploy && next build`
   so migrations run before the build.
5. Set `STORAGE_DRIVER=cloudinary` with its three keys — the filesystem is not
   writable between requests.

After the first deploy, sign in and set the real company details under
**Settings → Company**: GSTIN, address, bank details and the home state, which
drives every GST calculation.

---

© Nutan Tech Solutions, Bengaluru. *Precision Restored, Performance Assured.*
