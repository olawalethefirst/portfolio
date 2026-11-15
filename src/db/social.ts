import "server-only";
import { eq } from "drizzle-orm";
import { pgTable, smallint, text } from "drizzle-orm/pg-core";
import type { SocialDraft } from "@/src/cms/social";
import { getDb } from "./client";

// Query mapping only; supabase/migrations remains the schema authority.
const socialContent = pgTable("social_content", {
  id: smallint("id").primaryKey(),
  github: text("github").notNull(),
  linkedin: text("linkedin").notNull(),
  x: text("x").notNull(),
});

function content(row: typeof socialContent.$inferSelect): SocialDraft {
  return { github: row.github, linkedin: row.linkedin, x: row.x };
}

export async function readSocial(): Promise<SocialDraft | null> {
  const [row] = await getDb()
    .select()
    .from(socialContent)
    .where(eq(socialContent.id, 1));
  return row ? content(row) : null;
}

export async function updateSocial(value: SocialDraft): Promise<SocialDraft | null> {
  const [row] = await getDb()
    .update(socialContent)
    .set({ github: value.github, linkedin: value.linkedin, x: value.x })
    .where(eq(socialContent.id, 1))
    .returning();
  return row ? content(row) : null;
}
