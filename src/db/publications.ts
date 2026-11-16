import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { date, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import type {
  PublicationDraft,
  PublicationRecord,
} from "@/src/cms/publications";
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
  row:
    | typeof publications.$inferSelect
    | typeof publishedPublications.$inferSelect,
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

type PublicationInput = PublicationDraft;

function publicationValues(value: PublicationInput) {
  const coverAssetId =
    value.coverSrc.match(/^\/media\/([0-9a-f-]{36})$/i)?.[1] ?? null;
  return {
    title: value.title,
    summary: value.summary,
    bodyMarkdown: value.bodyMarkdown,
    coverAssetId,
    coverAlt: value.coverAlt,
    tagsText: value.tagsText,
    publishedOn: value.publishedOn || null,
  };
}

export async function insertPublication(
  value: PublicationInput,
): Promise<PublicationRecord> {
  const [row] = await getDb()
    .insert(publications)
    .values(publicationValues(value))
    .returning();
  if (!row) throw new Error("Publication insert did not return content.");
  return record(row, undefined);
}

export async function updatePublication(
  id: string,
  value: PublicationInput,
): Promise<PublicationRecord | null> {
  const [row] = await getDb()
    .update(publications)
    .set(publicationValues(value))
    .where(eq(publications.id, id))
    .returning();
  return row ? record(row, undefined) : null;
}

export async function saveAndPublishPublication(
  id: string,
  value: PublicationDraft,
): Promise<PublicationRecord | null> {
  return getDb().transaction(async (tx) => {
    const [saved] = await tx
      .update(publications)
      .set(publicationValues(value))
      .where(eq(publications.id, id))
      .returning();
    if (!saved) return null;
    const [live] = await tx
      .insert(publishedPublications)
      .values({ publicationId: id, ...publicationValues(value) })
      .onConflictDoUpdate({
        target: publishedPublications.publicationId,
        set: publicationValues(value),
      })
      .returning();
    if (!live) throw new Error("Publication publish did not return content.");
    return record(saved, live);
  });
}

export async function deletePublishedPublication(
  id: string,
): Promise<PublicationDraft | null> {
  const [row] = await getDb()
    .delete(publishedPublications)
    .where(eq(publishedPublications.publicationId, id))
    .returning();
  return row ? draft(row) : null;
}

export async function createAndPublishPublication(
  value: PublicationDraft,
): Promise<PublicationRecord> {
  return getDb().transaction(async (tx) => {
    const [saved] = await tx
      .insert(publications)
      .values(publicationValues(value))
      .returning();
    if (!saved) throw new Error("Publication creation did not return content.");
    const [live] = await tx
      .insert(publishedPublications)
      .values({ publicationId: saved.id, ...publicationValues(value) })
      .returning();
    if (!live) throw new Error("Publication publish did not return content.");
    return record(saved, live);
  });
}

export async function deletePublication(id: string): Promise<string | null> {
  // The authoritative FK cascades published snapshots; media is retained.
  const [row] = await getDb()
    .delete(publications)
    .where(eq(publications.id, id))
    .returning({ id: publications.id });
  return row?.id ?? null;
}

/** Caller validates UUID structure; membership and writes share one transaction. */
export async function reorderPublications(
  ids: readonly string[],
): Promise<{ status: "saved" | "conflict" }> {
  const orderedIds = ids.map((id) => id.toLowerCase());
  const requested = new Set(orderedIds);
  if (requested.size !== orderedIds.length) return { status: "conflict" };

  return getDb().transaction(
    async (tx) => {
      // Row locks cannot protect against new rows. This self-exclusive table lock
      // also serializes reorders while permitting ordinary collection reads.
      // https://www.postgresql.org/docs/current/explicit-locking.html
      await tx.execute(
        sql`lock table ${publications} in share row exclusive mode`,
      );
      const current = await tx.select({ id: publications.id }).from(publications);
      if (
        current.length !== orderedIds.length ||
        current.some(({ id }) => !requested.has(id))
      )
        return { status: "conflict" };

      if (orderedIds.length) {
        const positions = orderedIds.map(
          (id, position) => sql`when ${id}::uuid then ${position}::integer`,
        );
        await tx.update(publications).set({
          position: sql`case ${publications.id} ${sql.join(positions, sql` `)} end`,
        });
      }
      return { status: "saved" };
    },
    { isolationLevel: "read committed" },
  );
}
