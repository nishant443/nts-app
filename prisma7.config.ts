import "dotenv/config";
import { defineConfig } from "prisma/config";

function directUrl(url: string | undefined): string | undefined {
  return url?.replace("-pooler.", ".");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: directUrl(process.env["DATABASE_URL"]),
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});
