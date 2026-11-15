import "server-only";
import { asc, eq } from "drizzle-orm";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import type { SeoRecord } from "@/src/cms/seo";
import { getDb } from "./client";

// Query mapping only; supabase/migrations remains the schema authority.
const seo = pgTable("seo", {
  id: uuid("id").primaryKey(),
  path: text("path").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
});

export async function listSeo(): Promise<SeoRecord[]> {
  return getDb().select().from(seo).orderBy(asc(seo.path));
}

export async function readSeo(id: string): Promise<SeoRecord | null> {
  const [row] = await getDb().select().from(seo).where(eq(seo.id, id));
  return row ?? null;
}
