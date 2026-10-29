import "server-only";

import { RateLimitError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 60_000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function hit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      ),
    };
  }

  return {
    ok: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

export function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): void {
  const result = hit(key, limit, windowSeconds);
  if (!result.ok) throw new RateLimitError(result.retryAfterSeconds);
}

// In-memory buckets are per server instance, which is fine for coarse
// throttling. Limits that guard credentials must hold across every instance,
// so they live in Postgres instead.
export async function enforceSharedRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const [row] = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "rate_limits" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rate_limits"."resetAt" <= now() THEN 1
                     ELSE "rate_limits"."count" + 1 END,
      "resetAt" = CASE WHEN "rate_limits"."resetAt" <= now() THEN EXCLUDED."resetAt"
                       ELSE "rate_limits"."resetAt" END
    RETURNING "count", "resetAt"
  `;

  if (Math.random() < 0.02) {
    await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } });
  }

  if (row && row.count > limit) {
    throw new RateLimitError(
      Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000)),
    );
  }
}

export const RateLimits = {
  login: { limit: 8, windowSeconds: 300 },
  passwordReset: { limit: 5, windowSeconds: 900 },
  read: { limit: 240, windowSeconds: 60 },
  write: { limit: 60, windowSeconds: 60 },
  export: { limit: 20, windowSeconds: 60 },
  upload: { limit: 30, windowSeconds: 300 },
} as const;

// The left-most X-Forwarded-For entry is whatever the client sent, so it is
// never trusted. Vercel overwrites x-vercel-forwarded-for and x-real-ip with
// the real client address; behind any other single proxy the right-most
// X-Forwarded-For entry is the one that proxy appended.
export function clientIp(headers: Headers): string {
  const vercel = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;

  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;

  const forwarded = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return forwarded || "unknown";
}

export function clientKey(request: Request, suffix: string): string {
  return `${suffix}:${clientIp(request.headers)}`;
}
