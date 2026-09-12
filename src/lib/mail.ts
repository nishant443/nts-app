import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

/**
 * Outbound email.
 *
 * Optional: with no SMTP host configured the app runs normally and the "Send by
 * email" buttons explain that mail has not been set up, rather than failing at
 * the moment somebody presses one. `isMailConfigured()` is what the UI checks.
 *
 * Gmail works with an app password (SMTP_HOST=smtp.gmail.com, SMTP_PORT=465,
 * SMTP_SECURE=true).
 */

export function isMailConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_FROM);
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!isMailConfigured()) {
    throw new AppError(
      "Email has not been set up. Ask your administrator to configure SMTP, or download the PDF and send it yourself.",
      { status: 503, code: "mail_not_configured" },
    );
  }

  // Connections are pooled and reused; building a transport per send would
  // renegotiate TLS every time.
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth:
      env.SMTP_USER && env.SMTP_PASSWORD
        ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
        : undefined,
    pool: true,
    maxConnections: 2,
  });

  return transporter;
}

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: MailAttachment[];
  replyTo?: string;
}): Promise<void> {
  const transport = getTransporter();

  try {
    await transport.sendMail({
      from: env.SMTP_FROM,
      to: options.to,
      replyTo: options.replyTo,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    });
  } catch (error) {
    console.error("[mail] send failed", error);
    throw new AppError(
      "The email could not be sent. Check the SMTP settings, or download the PDF and send it yourself.",
      { status: 502, code: "mail_failed" },
    );
  }
}

/**
 * Plain-text and HTML bodies for sending a quotation or invoice.
 *
 * Deliberately simple markup — business mail clients (Outlook in particular)
 * render elaborate templates unpredictably, and this has to look right the
 * first time it reaches a customer.
 */
export function documentEmail(options: {
  kind: "Quotation" | "Invoice";
  number: string;
  customerName: string;
  companyName: string;
  total: string;
  dueLabel?: string;
  dueValue?: string;
  senderName: string;
  senderPhone: string | null;
  senderEmail: string | null;
}): { subject: string; text: string; html: string } {
  const subject = `${options.kind} ${options.number} from ${options.companyName}`;

  const dueLine =
    options.dueLabel && options.dueValue
      ? `${options.dueLabel}: ${options.dueValue}`
      : null;

  const signOff = [
    options.senderName,
    options.companyName,
    options.senderPhone,
    options.senderEmail,
  ]
    .filter(Boolean)
    .join("\n");

  const text = [
    `Dear ${options.customerName},`,
    "",
    `Please find attached ${options.kind.toLowerCase()} ${options.number} for ${options.total}.`,
    dueLine,
    "",
    options.kind === "Quotation"
      ? "Do let us know if you would like any changes, and we will be glad to revise it."
      : "Kindly arrange payment as per the terms on the invoice. Our bank details are printed on it.",
    "",
    "Thank you for your business.",
    "",
    signOff,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#131a24;line-height:1.6">
  <p>Dear ${escapeHtml(options.customerName)},</p>
  <p>
    Please find attached ${options.kind.toLowerCase()}
    <strong>${escapeHtml(options.number)}</strong> for
    <strong>${escapeHtml(options.total)}</strong>.
  </p>
  ${dueLine ? `<p>${escapeHtml(dueLine)}</p>` : ""}
  <p>
    ${
      options.kind === "Quotation"
        ? "Do let us know if you would like any changes, and we will be glad to revise it."
        : "Kindly arrange payment as per the terms on the invoice. Our bank details are printed on it."
    }
  </p>
  <p>Thank you for your business.</p>
  <p style="margin-top:20px;padding-top:14px;border-top:1px solid #e3e8ef;color:#566274">
    ${escapeHtml(options.senderName)}<br>
    <strong style="color:#131a24">${escapeHtml(options.companyName)}</strong><br>
    ${options.senderPhone ? `${escapeHtml(options.senderPhone)}<br>` : ""}
    ${options.senderEmail ? escapeHtml(options.senderEmail) : ""}
  </p>
</div>`.trim();

  return { subject, text, html };
}

/** Customer and company names are user-controlled; never interpolate raw. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
