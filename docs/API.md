# API reference

The application is server-rendered, so most work happens through **Server
Actions** rather than a public REST API. Route handlers exist for the things
that genuinely need a URL: file downloads, uploads and search.

Both are treated identically from a security standpoint — a Server Action is a
public endpoint that anyone can replay, so it gets the same role check, rate
limit and validation as a route handler.

---

## Authentication

Every request carries an `httpOnly` cookie named `nts_session` holding an HS256
JWT with three claims:

```json
{ "userId": "clx…", "role": "ADMIN", "sv": 3 }
```

The cookie is a hint, not proof. On each request the Data Access Layer re-reads
the user and rejects the session if the account is no longer `ACTIVE` or if
`sv` no longer matches `User.sessionVersion` — so a deactivated account or a
changed password takes effect immediately.

There is no token endpoint and no API key: the app is internal and browser-only.

---

## Errors

Every route handler returns errors in the same shape:

```json
{
  "error": "Please correct the highlighted fields.",
  "code": "validation_error",
  "fieldErrors": { "amount": ["Maximum 12500.00"] }
}
```

| Status | `code` | Meaning |
| --- | --- | --- |
| 400 | `bad_request` | Malformed request |
| 401 | `unauthorized` | No session, or the session is no longer valid |
| 403 | `forbidden` | Signed in, but the role is not allowed |
| 404 | `not_found` | Record does not exist |
| 409 | `conflict` | Blocked by a business rule (e.g. deleting a customer with invoices) |
| 422 | `validation_error` | Failed Zod validation; `fieldErrors` is present |
| 429 | `rate_limited` | Over budget; `Retry-After` header gives the wait in seconds |
| 500 | `internal_error` | Unexpected. Details are logged server-side, never returned |

`fieldErrors` is keyed by form input name, ready to render beside the field.

---

## Rate limits

Applied per account where a session exists, per IP otherwise.

| Class | Budget |
| --- | --- |
| Login | 8 per email / 24 per IP per 5 min |
| Reads (`GET`) | 240 per minute |
| Writes | 60 per minute |
| PDF and spreadsheet exports | 20 per minute |
| Uploads | 30 per 5 minutes |

Limits are held in process. With more than one instance, replace `hit()` in
`src/lib/rate-limit.ts` with a Redis `INCR`/`EXPIRE`; no call site changes.

---

## Route handlers

### Documents (PDF)

Returned inline so the browser previews them; `Content-Disposition` carries a
filename for saving.

| Method | Path | Access | Returns |
| --- | --- | --- | --- |
| `GET` | `/api/pdf/quotation/{id}` | any signed-in user | Quotation PDF |
| `GET` | `/api/pdf/invoice/{id}` | any signed-in user | GST tax invoice PDF |
| `GET` | `/api/pdf/payslip/{id}` | owner or admin | Payslip PDF |

Payslips are the one place with record-level access control: an employee may
only fetch their own, and only once the payroll run is `FINALIZED` or `PAID`.
Draft figures are not final and never leave the building.

```http
GET /api/pdf/invoice/clx8f2k00001 HTTP/1.1
Cookie: nts_session=…

HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="NTS-INV-26-27-28.pdf"
Cache-Control: private, no-store
```

### Exports (Excel)

All admin-only, returned as `.xlsx` attachments.

| Method | Path | Query | Contents |
| --- | --- | --- | --- |
| `GET` | `/api/export/sales` | `from`, `to` (`YYYY-MM-DD`, default: current financial year) | Sales register with GST breakdown, plus a per-customer summary sheet |
| `GET` | `/api/export/attendance` | `month` (1–12), `year` (default: current month) | Attendance summary per employee |
| `GET` | `/api/export/payroll/{id}` | — | Payroll register including bank account and IFSC, for the salary transfer |

```http
GET /api/export/sales?from=2026-04-01&to=2027-03-31
```

### Search

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/api/search?q={term}` | any signed-in user |

`q` must be 2–80 characters. Results are **scoped by role on the server**: an
employee never receives employee records, and only sees invoices they raised or
that belong to customers they own. Each kind is capped at five so one prolific
match cannot crowd out the others.

```json
{
  "results": [
    {
      "id": "clx…",
      "kind": "customer",
      "title": "Yamazaki Mazak India Pvt Ltd",
      "subtitle": "Pune · active",
      "href": "/customers/clx…"
    },
    {
      "id": "clx…",
      "kind": "invoice",
      "title": "NTS/INV/26-27/28",
      "subtitle": "MultiTeck Engineering · ₹1,39,240.00",
      "href": "/invoices/clx…"
    }
  ]
}
```

`kind` is one of `customer`, `invoice`, `quotation`, `employee`, `payment`.

### Uploads

| Method | Path | Access |
| --- | --- | --- |
| `POST` | `/api/upload` | any signed-in user |

`multipart/form-data` with:

| Field | Required | Notes |
| --- | --- | --- |
| `file` | yes | JPG, PNG, WEBP or PDF, max 10 MB |
| `folder` | no | `receipts`, `documents` or `avatars` (default `documents`) |

The file's real type is detected from its magic bytes; the browser-supplied MIME
type is ignored, and the declared extension must agree with the actual content.

```json
{
  "url": "/api/files/receipts/9f2c….pdf",
  "name": "toll-receipt.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 84213
}
```

Returns `201`. Use `url` verbatim — it points at Cloudinary or the local file
route depending on `STORAGE_DRIVER`.

### Stored files

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/api/files/{...path}` | any signed-in user |

Serves files written by the local storage driver, streamed rather than buffered.
These live outside `public/` deliberately: receipts and ID proofs must not be
readable by anyone who guesses a URL. Path traversal is rejected before the
filesystem is touched.

---

## Server Actions

Invoked by the framework from forms and buttons; not addressable URLs. Listed
here because they are the real write API.

### Shape

Form-backed actions take `(prevState, formData)` and return a `FormState`:

```ts
{ error?: string; fieldErrors?: Record<string, string[]>; success?: string; ts?: number }
```

Button-backed actions take a typed input and return a result:

```ts
{ ok: true; data: T } | { ok: false; error: string }
```

Expected failures come back as values so the form stays mounted and shows the
message inline. Unexpected ones are logged server-side and collapse to a generic
message.

### Available actions

| Module | Actions | Access |
| --- | --- | --- |
| `auth` | `signIn`, `signOut`, `changePassword` | public / user |
| `customers` | `saveCustomer`, `deleteCustomer` | user (create) · admin (edit, delete) |
| `quotations` | `saveQuotation`, `setQuotationStatus`, `convertQuotationToInvoice`, `deleteQuotation` | user · admin (convert, delete) |
| `email` | `emailDocument` — sends a quotation or invoice with the PDF attached | admin |
| `invoices` | `saveInvoice`, `setInvoiceStatus`, `deleteInvoice` | admin |
| `payments` | `savePayment`, `markPaymentReceived`, `deletePayment` | admin |
| `purchase-orders` | `savePurchaseOrder`, `setPurchaseOrderStatus`, `deletePurchaseOrder` | admin |
| `attendance` | `checkIn`, `checkOut`, `markAttendance` | user · admin (mark) |
| `leave` | `submitLeaveRequest`, `cancelLeaveRequest`, `reviewLeaveRequest`, `setLeaveAllocation` | user · admin (review, allocate) |
| `work` | `saveWorkLog`, `reviewWorkLog`, `deleteWorkLog`, `saveExpense`, `reviewExpense`, `deleteExpense` | user · admin (review) |
| `payroll` | `createPayrollRun`, `generatePayslips`, `setPayrollStatus`, `deletePayrollRun`, `saveSalaryStructure` | admin |
| `employees` | `createEmployee`, `updateEmployee`, `resetEmployeePassword`, `updateOwnProfile` | admin · user (own profile) |
| `tasks` | `saveTask`, `cancelTask` · `progressTask` | admin · user (assignee) |
| `documents` | `saveDocument`, `deleteDocument` | user |
| `settings` | `saveCompanySettings`, `addHoliday`, `deleteHoliday` | admin |
| `notifications` | `markNotificationRead`, `markAllNotificationsRead` | user |

### Rules enforced in actions, not the UI

These are business invariants, checked server-side regardless of what the
interface allows:

- A payment cannot exceed the balance on the invoice it settles.
- An invoice cannot be edited below what has already been received against it.
- An invoice with payments recorded cannot be cancelled or deleted.
- A customer with quotations, invoices or payments cannot be deleted — mark them
  inactive instead.
- A converted quotation is locked; it now backs an invoice.
- Overlapping leave requests are rejected, so a balance cannot be double-counted.
- The last active administrator cannot be demoted or deactivated.
- A finalized payroll run cannot be deleted, and its payslips cannot be
  regenerated until it is reopened.
- Paid, partially paid and overdue invoice statuses are derived from payments;
  they cannot be set by hand.
- Emailing a draft quotation or invoice moves it to `Sent`, because that is what
  actually happened.
- A task can only be assigned to an active employee, only its assignee (or an
  admin) can start or complete it, and a completed or cancelled task is frozen.
  Reassigning resets it to `Open` for the new person.

### Email

`emailDocument({ kind, id, to? })` renders the PDF, attaches it, and sends it to
the customer's address — or to `to` if the sender overrides it for that send.
`Reply-To` is set to the person who pressed the button, so the customer's reply
reaches them rather than a shared mailbox. Rate limited as an export (20/min),
since each call renders a PDF and opens an SMTP connection.

With no `SMTP_HOST` configured, `isMailConfigured()` returns false and the UI
disables the button with an explanation. Nothing else in the app depends on
mail being available.

Task assignment (`saveTask`) also emails the assignee — full description,
priority, due date, customer, who assigned it and a link — but best-effort: the
task is saved and the in-app notification delivered whether or not mail is set
up, and `Task.emailedAt` records whether the message actually left. Reassigning
a task emails the new assignee; ordinary edits do not send mail.

---

## Data model

Twenty-four models. The ones that matter most:

```
User ─┬─ EmployeeProfile (1:1)
      ├─ SalaryStructure (versioned by effectiveFrom)
      ├─ Attendance      (unique: userId + date)
      ├─ LeaveRequest / LeaveBalance
      ├─ DailyWorkLog ── Expense
      ├─ Task            (assignee · assignedBy · optional Customer)
      └─ Payslip ─────── PayrollRun (unique: year + month)

Customer ─┬─ Quotation ── QuotationItem
          ├─ Invoice ──┬─ InvoiceItem
          │            └─ Payment
          └─ PurchaseOrder ── PurchaseOrderItem

CompanySettings (single row)   Holiday   Document   Notification   AuditLog
```

Money columns are `Decimal(14,2)`. Prisma returns them as `Decimal` objects,
which cannot be serialised to a Client Component — map them with `toMoney()`
from `src/lib/money.ts` first.

Calendar dates (attendance, leave, holidays) are stored at **UTC midnight** so a
date means the same day irrespective of server timezone.

Indexes cover every filtered column: `userId + date`, `status + date`,
`customerId`, `dueDate`, and the unique keys above.
