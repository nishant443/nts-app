import "server-only";

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  STORAGE_DRIVER: z.enum(["local", "cloudinary"]).default("local"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  SMTP_HOST: z
    .string()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z
    .string()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  GSTIN_API_URL: z
    .string()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  GSTIN_API_KEY: z
    .string()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  GSTIN_API_KEY_HEADER: z
    .string()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  if (
    parsed.data.STORAGE_DRIVER === "cloudinary" &&
    !(
      parsed.data.CLOUDINARY_CLOUD_NAME &&
      parsed.data.CLOUDINARY_API_KEY &&
      parsed.data.CLOUDINARY_API_SECRET
    )
  ) {
    throw new Error(
      'STORAGE_DRIVER is "cloudinary" but CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET are not all set.',
    );
  }

  if (parsed.data.SMTP_HOST && !parsed.data.SMTP_FROM) {
    throw new Error("SMTP_HOST is set but SMTP_FROM is missing.");
  }

  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
