"use client";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requestJson } from "@/src/api/client";
import {
  uploadDescriptorSchema,
  validateImageFile,
  type UploadConfig,
  type UploadedImage,
} from "./upload-reference";

const permissionSchema = uploadDescriptorSchema.safeExtend({
  token: z.string().trim().min(1),
});
export async function uploadImage(
  file: File,
  config: UploadConfig,
): Promise<UploadedImage> {
  validateImageFile(file);
  if (!config.url || !config.publishableKey)
    throw new Error(
      "Image uploads are not configured. Contact the site administrator.",
    );
  const permission = await requestJson(
    "/api/admin/media/uploads",
    permissionSchema,
    {
      method: "POST",
      body: { contentType: file.type, size: file.size },
    },
  );
  try {
    const storage = createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }).storage.from(permission.bucket);
    const { data, error } = await storage.uploadToSignedUrl(
      permission.path,
      permission.token,
      file,
      {
        contentType: file.type,
        upsert: false,
        cacheControl: "31536000",
      },
    );
    if (error || !data || data.path !== permission.path)
      throw new Error("Invalid upload result.");
    const source = storage.getPublicUrl(permission.path).data.publicUrl;
    return {
      source,
      descriptor: {
        assetId: permission.assetId,
        bucket: permission.bucket,
        path: permission.path,
      },
    };
  } catch {
    throw new Error("Upload failed. Retry or choose another image.");
  }
}
