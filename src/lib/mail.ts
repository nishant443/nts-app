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

const BRAND = "#1f4e79";
const BRAND_DARK = "#163a5a";
const INK = "#131a24";
const MUTED = "#566274";
const LINE = "#e3e8ef";
const PAGE_BG = "#eef2f7";

function emailShell(options: {
  companyName: string;
  eyebrow: string;
  heading: string;
  intro: string;
  body: string;
  cta?: { label: string; href: string } | null;
  footnote?: string;
}): string {
  const company = escapeHtml(options.companyName);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(options.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};-webkit-text-size-adjust:100%">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(options.intro)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAGE_BG}">
    <tr>
      <td align="center" style="padding:28px 12px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(19,26,36,.06)">
          <tr>
            <td style="height:6px;background:linear-gradient(90deg,${BRAND} 0%,#2f77ff 100%);font-size:0;line-height:0">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:30px 32px 8px;font-family:Arial,Helvetica,sans-serif">
              <p style="margin:0 0 14px;font-size:11.5px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;color:${BRAND}">${escapeHtml(options.eyebrow)}</p>
              <h1 style="margin:0 0 10px;font-size:22px;line-height:1.3;font-weight:bold;color:${INK}">${escapeHtml(options.heading)}</h1>
              <p style="margin:0;font-size:14.5px;line-height:1.6;color:${MUTED}">${options.intro}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 8px;font-family:Arial,Helvetica,sans-serif;font-size:14.5px;line-height:1.6;color:${INK}">
              ${options.body}
            </td>
          </tr>
          ${
            options.cta
              ? `<tr>
            <td style="padding:14px 32px 30px;font-family:Arial,Helvetica,sans-serif">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:8px;background:${BRAND}">
                    <a href="${escapeHtml(options.cta.href)}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;border:1px solid ${BRAND_DARK}">${escapeHtml(options.cta.label)} &rarr;</a>
                  </td>
                </tr>
              </table>
              ${options.footnote ? `<p style="margin:14px 0 0;font-size:12.5px;line-height:1.5;color:${MUTED}">${escapeHtml(options.footnote)}</p>` : ""}
            </td>
          </tr>`
              : `<tr><td style="height:22px;font-size:0;line-height:0">&nbsp;</td></tr>`
          }
          <tr>
            <td style="padding:22px 32px 26px;border-top:1px solid ${LINE};background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle">
                    <img src="cid:${LOGO_CID}" width="120" height="55" alt="${company}" style="display:block;width:120px;height:auto;border:0">
                  </td>
                  <td align="right" style="vertical-align:middle;font-size:12.5px;line-height:1.5;color:${MUTED}">
                    <strong style="color:${INK}">${company}</strong><br>
                    Sent automatically from the NTS app
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;color:#8a94a6">You are receiving this because you have an account with ${company}.</p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function detailsTable(rows: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${LINE};border-radius:10px;border-collapse:separate;overflow:hidden;font-size:13.5px">
    ${rows
      .map(
        (
          [label, value],
          index,
        ) => `<tr style="background:${index % 2 === 0 ? "#f8fafc" : "#ffffff"}">
      <td style="padding:9px 14px;width:36%;color:${MUTED};vertical-align:top;border-top:${index === 0 ? "0" : `1px solid ${LINE}`}">${escapeHtml(label)}</td>
      <td style="padding:9px 14px;color:${INK};font-weight:bold;vertical-align:top;border-top:${index === 0 ? "0" : `1px solid ${LINE}`}">${escapeHtml(value)}</td>
    </tr>`,
      )
      .join("")}
  </table>`;
}

function calloutBox(
  title: string,
  text: string,
  tone: "brand" | "success",
): string {
  const color = tone === "success" ? "#0f9d58" : BRAND;
  const bg = tone === "success" ? "#e6f6ee" : "#eaf2fb";
  return `<div style="margin:0 0 18px;padding:14px 16px;background:${bg};border-left:4px solid ${color};border-radius:8px">
    <div style="font-size:11.5px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:${color}">${escapeHtml(title)}</div>
    <div style="white-space:pre-line;margin-top:6px;color:${INK}">${escapeHtml(text)}</div>
  </div>`;
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

  const closing =
    options.kind === "Quotation"
      ? "Do let us know if you would like any changes, and we will be glad to revise it."
      : "Kindly arrange payment as per the terms on the invoice. Our bank details are printed on it.";

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
    closing,
    "",
    "Thank you for your business.",
    "",
    signOff,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const rows: [string, string][] = [
    [`${options.kind} no.`, options.number],
    ["Amount", options.total],
  ];
  if (options.dueLabel && options.dueValue) {
    rows.push([options.dueLabel, options.dueValue]);
  }

  const html = emailShell({
    companyName: options.companyName,
    eyebrow: options.kind,
    heading: `${options.kind} ${options.number}`,
    intro: `Dear ${escapeHtml(options.customerName)}, please find the ${options.kind.toLowerCase()} attached to this email.`,
    body: `
      ${detailsTable(rows)}
      <p style="margin:18px 0 0">${escapeHtml(closing)}</p>
      <p style="margin:12px 0 0">Thank you for your business.</p>
      <p style="margin:18px 0 0;padding-top:14px;border-top:1px solid ${LINE};color:${MUTED};font-size:13.5px">
        ${escapeHtml(options.senderName)}<br>
        <strong style="color:${INK}">${escapeHtml(options.companyName)}</strong><br>
        ${options.senderPhone ? `${escapeHtml(options.senderPhone)}<br>` : ""}
        ${options.senderEmail ? escapeHtml(options.senderEmail) : ""}
      </p>`,
  });

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
  const verb = options.reassigned
    ? "reassigned a task to you"
    : "assigned you a new task";

  const details: [string, string][] = [
    ["Priority", options.priority],
    ["Due", options.dueDate ?? "No due date"],
    ["Customer", options.customer ?? "Not customer-specific"],
    ["Assigned by", options.assignedBy],
  ];

  const text = [
    `Hi ${options.assigneeName},`,
    "",
    `${options.assignedBy} has ${verb}.`,
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

  const html = emailShell({
    companyName: options.companyName,
    eyebrow: options.reassigned ? "Task reassigned" : "New task",
    heading: options.title,
    intro: `Hi ${escapeHtml(options.assigneeName)}, <strong style="color:${INK}">${escapeHtml(options.assignedBy)}</strong> has ${verb}.`,
    body: `
      ${options.description ? calloutBox("What needs doing", options.description, "brand") : ""}
      ${detailsTable(details)}`,
    cta: { label: "Open the task", href: options.link },
    footnote: "Update its progress from the Tasks page once you start.",
  });

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
    ...(options.note
      ? [`Note from ${options.completedBy}:`, options.note, ""]
      : []),
    ...details.map(([label, value]) => `${label}: ${value}`),
    "",
    `Open the task: ${options.link}`,
    "",
    options.companyName,
  ].join("\n");

  const html = emailShell({
    companyName: options.companyName,
    eyebrow: "Task completed",
    heading: options.title,
    intro: `Hi ${escapeHtml(options.recipientName)}, <strong style="color:${INK}">${escapeHtml(options.completedBy)}</strong> has marked a task you assigned as <strong style="color:#0f9d58">complete</strong>.`,
    body: `
      ${options.note ? calloutBox(`Note from ${options.completedBy}`, options.note, "success") : ""}
      ${detailsTable(details)}`,
    cta: { label: "Open the task", href: options.link },
  });

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

  const html = emailShell({
    companyName: options.companyName,
    eyebrow: options.category,
    heading: options.title,
    intro: `Hi ${escapeHtml(options.recipientName)}, here is an update from the NTS app.`,
    body: options.body
      ? `<div style="padding:14px 16px;background:#f8fafc;border:1px solid ${LINE};border-radius:10px;white-space:pre-line">${escapeHtml(options.body)}</div>`
      : "",
    cta: options.link ? { label: "Open in NTS", href: options.link } : null,
  });

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
