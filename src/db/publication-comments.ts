import "server-only";
import { asc, eq } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type {
  PublicationComment,
  PublicationCommentInput,
} from "@/src/cms/publication-comments";
import { getDb } from "./client";

// Query mapping only; supabase/migrations remains the schema authority.
const publicationComments = pgTable("publication_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  publicationId: uuid("publication_id").notNull(),
  parentId: uuid("parent_id"),
  name: text("name").notNull(),
  bodyMarkdown: text("body_markdown").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

// Oldest first, so a thread's replies read in conversation order.
export async function listPublicationComments(
  publicationId: string,
): Promise<PublicationComment[]> {
  return getDb()
    .select()
    .from(publicationComments)
    .where(eq(publicationComments.publicationId, publicationId))
    .orderBy(asc(publicationComments.createdAt), asc(publicationComments.id));
}

export async function readPublicationComment(
  id: string,
): Promise<PublicationComment | null> {
  const [row] = await getDb()
    .select()
    .from(publicationComments)
    .where(eq(publicationComments.id, id));
  return row ?? null;
}

export async function insertPublicationComment(
  value: PublicationCommentInput,
): Promise<PublicationComment> {
  const [row] = await getDb()
    .insert(publicationComments)
    .values(value)
    .returning();
  if (!row) throw new Error("Comment insert did not return content.");
  return row;
}
