import "server-only";
import { asc, eq } from "drizzle-orm";
import { date, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import type { PublicationDraft, PublicationRecord } from "@/src/cms/publications";
import { getDb } from "./client";

// Query mappings only; supabase/migrations remains the schema authority.
const publications = pgTable("publications", {
  id: uuid("id").defaultRandom().primaryKey(),
  position: integer("position").notNull().default(0),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  bodyMarkdown: text("body_markdown").notNull(),
  coverAssetId: uuid("cover_asset_id"),
  coverAlt: text("cover_alt").notNull(),
  tagsText: text("tags_text").notNull(),
  publishedOn: date("published_on"),
});

const publishedPublications = pgTable("published_publications", {
  publicationId: uuid("publication_id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  bodyMarkdown: text("body_markdown").notNull(),
  coverAssetId: uuid("cover_asset_id"),
  coverAlt: text("cover_alt").notNull(),
  tagsText: text("tags_text").notNull(),
  publishedOn: date("published_on"),
});

function draft(
  row: typeof publications.$inferSelect | typeof publishedPublications.$inferSelect,
): PublicationDraft {
  return {
    title: row.title,
    summary: row.summary,
    bodyMarkdown: row.bodyMarkdown,
    coverSrc: row.coverAssetId ? `/media/${row.coverAssetId}` : "",
    coverAlt: row.coverAlt,
    tagsText: row.tagsText,
    publishedOn: row.publishedOn ?? "",
  };
}

function record(
  row: typeof publications.$inferSelect,
  publishedRow: typeof publishedPublications.$inferSelect | undefined,
): PublicationRecord {
  return {
    id: row.id,
    draft: draft(row),
    published: publishedRow ? draft(publishedRow) : null,
  };
}

export async function listPublications(): Promise<PublicationRecord[]> {
  const rows = await getDb()
    .select({ publication: publications, published: publishedPublications })
    .from(publications)
    .leftJoin(
      publishedPublications,
      eq(publications.id, publishedPublications.publicationId),
    )
    .orderBy(asc(publications.position), asc(publications.id));

  return rows.map(({ publication, published: publishedRow }) =>
    record(publication, publishedRow ?? undefined),
  );
}

export async function readPublication(
  id: string,
): Promise<PublicationRecord | null> {
  const [row] = await getDb()
    .select({ publication: publications, published: publishedPublications })
    .from(publications)
    .leftJoin(
      publishedPublications,
      eq(publications.id, publishedPublications.publicationId),
    )
    .where(eq(publications.id, id));

  return row ? record(row.publication, row.published ?? undefined) : null;
}
