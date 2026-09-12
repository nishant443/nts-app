import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration.
 *
 * `shadowDatabaseUrl` matters for local development: `prisma migrate dev`
 * replays the whole migration history into a throwaway database to check it
 * still applies cleanly. The local `prisma dev` server does not isolate
 * databases from one another, so the shadow database has to live on a second
 * server — started by `npm run db:start:shadow`.
 *
 * Hosted Postgres (Neon, Supabase, Render) isolates databases properly, so in
 * those environments `SHADOW_DATABASE_URL` can be left unset and Prisma will
 * create and drop the shadow database itself.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});
