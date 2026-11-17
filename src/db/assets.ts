import "server-only";
import { eq } from "drizzle-orm";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { getDb } from "./client";

// Query mappings only; supabase/migrations remains the schema authority.
const mediaAssets = pgTable("media_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  bucket: text("bucket").notNull(),
  objectKey: text("object_key").notNull(),
});

/** Insert/select only: shared with content-save transactions via a passed executor. */
type AssetExecutor = Pick<ReturnType<typeof getDb>, "insert" | "select">;

export async function isAssetRegistered(
  executor: AssetExecutor,
  id: string,
): Promise<boolean> {
  const [row] = await executor
    .select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id));
  return Boolean(row);
}

export async function registerAsset(
  executor: AssetExecutor,
  asset: { id: string; bucket: string; objectKey: string },
): Promise<void> {
  await executor
    .insert(mediaAssets)
    .values(asset)
    .onConflictDoNothing({ target: mediaAssets.id });
}
