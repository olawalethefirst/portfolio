import "server-only";
import { eq } from "drizzle-orm";
import { pgTable, smallint, text } from "drizzle-orm/pg-core";
import type { AboutDraft } from "@/src/cms/about";
import { getDb } from "./client";

// Query mapping only; supabase/migrations remains the schema authority.
const aboutContent = pgTable("about_content", {
  id: smallint("id").primaryKey(),
  heading: text("heading").notNull(),
  biography: text("biography").notNull(),
});

function content(row: typeof aboutContent.$inferSelect): AboutDraft {
  return { heading: row.heading, biography: row.biography };
}

export async function readAbout(): Promise<AboutDraft | null> {
  const [row] = await getDb()
    .select()
    .from(aboutContent)
    .where(eq(aboutContent.id, 1));
  return row ? content(row) : null;
}

export async function updateAbout(value: AboutDraft): Promise<AboutDraft | null> {
  const [row] = await getDb()
    .update(aboutContent)
    .set({ heading: value.heading, biography: value.biography })
    .where(eq(aboutContent.id, 1))
    .returning();
  return row ? content(row) : null;
}
