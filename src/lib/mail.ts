import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import nodemailer, { type Transporter } from "nodemailer";

import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

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
  cid?: string;
}

const LOGO_CID = "nts-logo";

let logoCache: Buffer | null | undefined;

async function loadLogo(): Promise<Buffer | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    logoCache = await readFile(
      path.join(process.cwd(), "public", "brand", "nts-logo.png"),
    );
  } catch {
    logoCache = null;
  }
  return logoCache;
}

function brandHeader(companyName: string): string {
  return `<p style="margin:0 0 18px"><img src="cid:${LOGO_CID}" width="150" height="69" alt="${escapeHtml(companyName)}" style="display:block;width:150px;height:auto;border:0"></p>`;
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

  const attachments = [...(options.attachments ?? [])];
  if (options.html?.includes(`cid:${LOGO_CID}`)) {
    const logo = await loadLogo();
    if (logo) {
      attachments.push({
        filename: "nts-logo.png",
        content: logo,
        contentType: "image/png",
        cid: LOGO_CID,
      });
    }
  }

  try {
    await transport.sendMail({
      from: env.SMTP_FROM,
      to: options.to,
      replyTo: options.replyTo,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments,
    });
  } catch (error) {
    console.error("[mail] send failed", error);
    throw new AppError(
      "The email could not be sent. Check the SMTP settings, or download the PDF and send it yourself.",
      { status: 502, code: "mail_failed" },
    );
  }
}

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
  ${brandHeader(options.companyName)}
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

export function taskAssignedEmail(options: {
  assigneeName: string;
  title: string;
  description: string;
  priority: string;
  dueDate: string | null;
  customer: string | null;
  assignedBy: string;
  companyName: string;
  link: string;
  reassigned?: boolean;
}): { subject: string; text: string; html: string } {
  const subject = `${options.reassigned ? "Task reassigned to you" : "New task"}: ${options.title}`;

  const details: [string, string][] = [
    ["Priority", options.priority],
    ["Due", options.dueDate ?? "No due date"],
    ["Customer", options.customer ?? "Not customer-specific"],
    ["Assigned by", options.assignedBy],
  ];

  const text = [
    `Hi ${options.assigneeName},`,
    "",
    `${options.assignedBy} has ${options.reassigned ? "reassigned a task to you" : "assigned you a new task"}.`,
    "",
    options.title,
    "",
    options.description,
    "",
    ...details.map(([label, value]) => `${label}: ${value}`),
    "",
    `Open the task: ${options.link}`,
    "",
    options.companyName,
  ].join("\n");

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#131a24;line-height:1.6">
  ${brandHeader(options.companyName)}
  <p>Hi ${escapeHtml(options.assigneeName)},</p>
  <p>
    <strong>${escapeHtml(options.assignedBy)}</strong> has
    ${options.reassigned ? "reassigned a task to you" : "assigned you a new task"}.
  </p>
  <h2 style="margin:20px 0 8px;font-size:17px;color:#131a24">${escapeHtml(options.title)}</h2>
  <p style="white-space:pre-line;margin:0 0 18px">${escapeHtml(options.description)}</p>
  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13.5px">
    ${details
      .map(
        ([label, value]) => `<tr>
      <td style="padding:4px 18px 4px 0;color:#566274;vertical-align:top">${escapeHtml(label)}</td>
      <td style="padding:4px 0;color:#131a24">${escapeHtml(value)}</td>
    </tr>`,
      )
      .join("")}
  </table>
  <p style="margin:22px 0">
    <a href="${escapeHtml(options.link)}"
       style="display:inline-block;padding:10px 18px;background:#1f4e79;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold">
      Open the task
    </a>
  </p>
  <p style="margin-top:20px;padding-top:14px;border-top:1px solid #e3e8ef;color:#566274">
    <strong style="color:#131a24">${escapeHtml(options.companyName)}</strong>
  </p>
</div>`.trim();

  return { subject, text, html };
}

export function taskCompletedEmail(options: {
  recipientName: string;
  completedBy: string;
  title: string;
  note: string | null;
  completedAt: string;
  customer: string | null;
  companyName: string;
  link: string;
}): { subject: string; text: string; html: string } {
  const subject = `Task completed: ${options.title}`;

  const details: [string, string][] = [
    ["Completed by", options.completedBy],
    ["Completed on", options.completedAt],
    ["Customer", options.customer ?? "Not customer-specific"],
  ];

  const text = [
    `Hi ${options.recipientName},`,
    "",
    `${options.completedBy} has marked a task you assigned as complete.`,
    "",
    options.title,
    "",
    ...(options.note ? [`Note from ${options.completedBy}:`, options.note, ""] : []),
    ...details.map(([label, value]) => `${label}: ${value}`),
    "",
    `Open the task: ${options.link}`,
    "",
    options.companyName,
  ].join("\n");

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#131a24;line-height:1.6">
  ${brandHeader(options.companyName)}
  <p>Hi ${escapeHtml(options.recipientName)},</p>
  <p>
    <strong>${escapeHtml(options.completedBy)}</strong> has marked a task you
    assigned as <strong style="color:#0f9d58">complete</strong>.
  </p>
  <h2 style="margin:20px 0 8px;font-size:17px;color:#131a24">${escapeHtml(options.title)}</h2>
  ${
    options.note
      ? `<div style="margin:0 0 18px;padding:12px 14px;background:#e6f6ee;border-left:3px solid #0f9d58;border-radius:4px">
    <div style="font-size:12px;font-weight:bold;color:#0f9d58;text-transform:uppercase;letter-spacing:.04em">Note from ${escapeHtml(options.completedBy)}</div>
    <div style="white-space:pre-line;margin-top:4px">${escapeHtml(options.note)}</div>
  </div>`
      : ""
  }
  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13.5px">
    ${details
      .map(
        ([label, value]) => `<tr>
      <td style="padding:4px 18px 4px 0;color:#566274;vertical-align:top">${escapeHtml(label)}</td>
      <td style="padding:4px 0;color:#131a24">${escapeHtml(value)}</td>
    </tr>`,
      )
      .join("")}
  </table>
  <p style="margin:22px 0">
    <a href="${escapeHtml(options.link)}"
       style="display:inline-block;padding:10px 18px;background:#1f4e79;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold">
      Open the task
    </a>
  </p>
  <p style="margin-top:20px;padding-top:14px;border-top:1px solid #e3e8ef;color:#566274">
    <strong style="color:#131a24">${escapeHtml(options.companyName)}</strong>
  </p>
</div>`.trim();

  return { subject, text, html };
}

export function notificationEmail(options: {
  recipientName: string;
  category: string;
  title: string;
  body: string | null;
  link: string | null;
  companyName: string;
}): { subject: string; text: string; html: string } {
  const subject = `${options.category}: ${options.title}`;

  const text = [
    `Hi ${options.recipientName},`,
    "",
    options.title,
    ...(options.body ? ["", options.body] : []),
    ...(options.link ? ["", `Open in NTS: ${options.link}`] : []),
    "",
    options.companyName,
  ].join("\n");

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#131a24;line-height:1.6">
  ${brandHeader(options.companyName)}
  <p style="margin:0 0 6px;font-size:12px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:#1f4e79">${escapeHtml(options.category)}</p>
  <p>Hi ${escapeHtml(options.recipientName)},</p>
  <h2 style="margin:12px 0 8px;font-size:17px;color:#131a24">${escapeHtml(options.title)}</h2>
  ${options.body ? `<p style="white-space:pre-line;margin:0 0 18px;color:#334155">${escapeHtml(options.body)}</p>` : ""}
  ${
    options.link
      ? `<p style="margin:22px 0">
    <a href="${escapeHtml(options.link)}"
       style="display:inline-block;padding:10px 18px;background:#1f4e79;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold">
      Open in NTS
    </a>
  </p>`
      : ""
  }
  <p style="margin-top:20px;padding-top:14px;border-top:1px solid #e3e8ef;color:#566274">
    <strong style="color:#131a24">${escapeHtml(options.companyName)}</strong>
  </p>
</div>`.trim();

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
