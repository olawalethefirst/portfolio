import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const databaseGlobal = globalThis as typeof globalThis & {
  portfolioDatabase?: ReturnType<typeof drizzle>;
};

/** Lazily reuse one server-side client, including across development reloads. */
export function getDb() {
  if (databaseGlobal.portfolioDatabase) return databaseGlobal.portfolioDatabase;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString?.trim()) throw new Error("DATABASE_URL is not configured.");

  // Supabase transaction pooling does not support prepared statements.
  // https://supabase.com/docs/guides/database/drizzle
  const client = postgres(connectionString, { prepare: false });
  databaseGlobal.portfolioDatabase = drizzle(client);
  return databaseGlobal.portfolioDatabase;
}
