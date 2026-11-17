import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isAssetRegistered } from "@/src/db/assets";
import { getDb } from "@/src/db/client";

const canonicalPattern =
  /^\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const unverifiable = () =>
  new Error("Referenced image could not be verified. Try uploading it again.");

export type ResolvedAsset =
  | { assetId: null }
  | { assetId: string; registration: null }
  | { assetId: string; registration: { bucket: string; objectKey: string } };

function lazyStorageClient() {
  let client:
    | {
        bucket: string;
        url: string;
        storage: ReturnType<ReturnType<typeof createClient>["storage"]["from"]>;
      }
    | undefined;
  return () => {
    if (client) return client;
    const url = process.env.SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SECRET_API_KEY?.trim();
    const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
    if (!url || !key || !bucket) throw new Error("Storage is not configured.");
    const storage = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }).storage.from(bucket);
    client = { bucket, url, storage };
    return client;
  };
}

function parsePublicUrlReference(source: string, url: string, bucket: string) {
  const prefix = `${url}/storage/v1/object/public/${bucket}/`;
  if (!source.startsWith(prefix)) return null;
  const objectKey = decodeURIComponent(source.slice(prefix.length));
  const match = /^([0-9a-f-]{36})\.(?:jpg|png|webp)$/i.exec(objectKey);
  return match ? { assetId: match[1], objectKey } : null;
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const current = next++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

/**
 * Resolves each source to its persistent asset id, verifying not-yet-registered
 * uploads against storage with bounded concurrency, before any content
 * transaction opens. Already-registered ids skip the storage round trip
 * entirely. Callers register the result inside their own save transaction.
 */
export async function resolveAssetReferences(
  sources: readonly string[],
  concurrency = 3,
): Promise<ResolvedAsset[]> {
  const db = getDb();
  const storageClient = lazyStorageClient();
  return mapWithConcurrency(sources, concurrency, async (source) => {
    if (!source) return { assetId: null };
    const canonical = canonicalPattern.exec(source);
    if (canonical) {
      const assetId = canonical[1];
      if (await isAssetRegistered(db, assetId))
        return { assetId, registration: null };
      throw unverifiable();
    }
    const { bucket, url, storage } = storageClient();
    const parsed = parsePublicUrlReference(source, url, bucket);
    if (!parsed) throw unverifiable();
    if (await isAssetRegistered(db, parsed.assetId))
      return { assetId: parsed.assetId, registration: null };
    const { data, error } = await storage.info(parsed.objectKey);
    if (
      error ||
      !data ||
      typeof data.size !== "number" ||
      data.size < 1 ||
      data.size > 10 * 1024 * 1024
    )
      throw unverifiable();
    return {
      assetId: parsed.assetId,
      registration: { bucket, objectKey: parsed.objectKey },
    };
  });
}
