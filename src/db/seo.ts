import "server-only";
import { and, asc, eq, ne } from "drizzle-orm";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import type { SeoRecord } from "@/src/seo/content";
import { getDb } from "./client";

// Query mapping only; supabase/migrations remains the schema authority.
const seo = pgTable("seo", {
  id: uuid("id").defaultRandom().primaryKey(),
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

export async function readSeoByPath(path: string): Promise<SeoRecord | null> {
  const [row] = await getDb().select().from(seo).where(eq(seo.path, path));
  return row ?? null;
}

type SeoInput = Omit<SeoRecord, "id">;

export async function insertSeo(value: SeoInput): Promise<SeoRecord> {
  const [row] = await getDb()
    .insert(seo)
    .values({
      path: value.path,
      title: value.title,
      description: value.description,
    })
    .returning();
  if (!row) throw new Error("SEO insert did not return content.");
  return row;
}

export async function updateSeo(
  id: string,
  value: SeoInput,
): Promise<SeoRecord | null> {
  const [row] = await getDb()
    .update(seo)
    .set({
      path: value.path,
      title: value.title,
      description: value.description,
    })
    .where(eq(seo.id, id))
    .returning();
  return row ?? null;
}

export async function deleteSeoOverride(id: string): Promise<SeoRecord | null> {
  const [row] = await getDb()
    .delete(seo)
    .where(and(eq(seo.id, id), ne(seo.path, "/")))
    .returning();
  return row ?? null;
}
