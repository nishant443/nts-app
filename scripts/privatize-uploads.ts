/**
 * One-off migration: turns uploads stored before private storage existed
 * (public https://res.cloudinary.com/... URLs on documents and expense
 * receipts) into private Cloudinary assets served through /api/files.
 *
 * Each asset is switched from type "upload" to "private" in place (no
 * re-upload, CDN copy invalidated), then every row that pointed at it is
 * rewritten to /api/files/<key>. Safe to re-run: rows already migrated are
 * skipped, and an asset that is already private is treated as done.
 *
 * Dry run (default, changes nothing):  npx tsx scripts/privatize-uploads.ts
 * Apply:                               npx tsx scripts/privatize-uploads.ts --apply
 */
import "dotenv/config";

import { createHash } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const apply = process.argv.includes("--apply");

const connectionString = process.env.DATABASE_URL;
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!connectionString || !cloudName || !apiKey || !apiSecret) {
  console.error(
    "DATABASE_URL and the three CLOUDINARY_* variables must be set.",
  );
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const PUBLIC_URL = new RegExp(
  `^https://res\\.cloudinary\\.com/${cloudName}/image/upload/(?:v\\d+/)?([a-z0-9-]+/[a-z0-9-]{8,64})\\.(jpe?g|png|webp|pdf)$`,
);

function sign(params: Record<string, string | number>): string {
  const payload = Object.keys(params)
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join("&");
  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

async function makePrivate(publicId: string): Promise<void> {
  const params = {
    from_public_id: publicId,
    to_public_id: publicId,
    type: "upload",
    to_type: "private",
    invalidate: "true",
    timestamp: Math.floor(Date.now() / 1000),
  };

  const form = new FormData();
  for (const [name, value] of Object.entries(params)) {
    form.append(name, String(value));
  }
  form.append("api_key", apiKey!);
  form.append("signature", sign(params));

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/rename`,
    { method: "POST", body: form },
  );

  if (response.ok) return;

  const detail = await response.text();
  // A previous partial run may already have moved it.
  if (response.status === 404 && (await isAlreadyPrivate(publicId))) return;
  throw new Error(`rename failed (${response.status}): ${detail}`);
}

async function isAlreadyPrivate(publicId: string): Promise<boolean> {
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/private/${publicId}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
      },
    },
  );
  return response.ok;
}

async function main() {
  const [documents, expenses] = await Promise.all([
    prisma.document.findMany({
      where: { url: { startsWith: "https://res.cloudinary.com/" } },
      select: { id: true, url: true },
    }),
    prisma.expense.findMany({
      where: { receiptUrl: { startsWith: "https://res.cloudinary.com/" } },
      select: { id: true, receiptUrl: true },
    }),
  ]);

  const rows = [
    ...documents.map((row) => ({ table: "document" as const, id: row.id, url: row.url })),
    ...expenses.map((row) => ({ table: "expense" as const, id: row.id, url: row.receiptUrl! })),
  ];

  console.log(
    `${documents.length} document(s) and ${expenses.length} receipt(s) still use public URLs.${apply ? "" : " Dry run: nothing will change."}`,
  );

  const done = new Map<string, string>();
  let migrated = 0;
  let skipped = 0;

  for (const row of rows) {
    const match = PUBLIC_URL.exec(row.url);
    if (!match) {
      console.warn(`  skip ${row.table} ${row.id}: unrecognised URL ${row.url}`);
      skipped += 1;
      continue;
    }

    const [, publicId, extension] = match;
    const newUrl = `/api/files/${publicId}.${extension}`;

    if (!apply) {
      console.log(`  would move ${row.table} ${row.id} → ${newUrl}`);
      continue;
    }

    try {
      if (!done.has(publicId!)) {
        await makePrivate(publicId!);
        done.set(publicId!, newUrl);
      }

      if (row.table === "document") {
        await prisma.document.update({ where: { id: row.id }, data: { url: newUrl } });
      } else {
        await prisma.expense.update({ where: { id: row.id }, data: { receiptUrl: newUrl } });
      }
      migrated += 1;
      console.log(`  moved ${row.table} ${row.id} → ${newUrl}`);
    } catch (error) {
      skipped += 1;
      console.error(`  FAILED ${row.table} ${row.id}:`, error instanceof Error ? error.message : error);
    }
  }

  if (apply) console.log(`Done. ${migrated} row(s) migrated, ${skipped} skipped or failed.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
