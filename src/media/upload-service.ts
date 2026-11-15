import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const extensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export type UploadContentType = keyof typeof extensions;

/** Issue permission only; registration happens during content Save/Publish. */
export async function issueUploadPermission(contentType: UploadContentType) {
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
  const assetId = randomUUID();
  const path = `${assetId}.${extensions[contentType]}`;
  const { data, error } = await storage.createSignedUploadUrl(path, {
    upsert: false,
  });
  if (
    error ||
    !data ||
    data.path !== path ||
    typeof data.token !== "string" ||
    !data.token.trim()
  ) {
    throw new Error("Unable to issue upload permission.");
  }
  return { assetId, bucket, path, token: data.token };
}
