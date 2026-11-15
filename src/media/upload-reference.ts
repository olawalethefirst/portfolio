import { z } from "zod";

export const uploadDescriptorSchema = z
  .object({
    assetId: z.uuid(),
    bucket: z.string().min(1),
    path: z.string(),
  })
  .refine(
    (value) =>
      ["jpg", "png", "webp"].some(
        (extension) => value.path === `${value.assetId}.${extension}`,
      ),
    "Invalid upload reference.",
  );
export type UploadDescriptor = z.infer<typeof uploadDescriptorSchema>;
export type UploadedImage = { source: string; descriptor: UploadDescriptor };
export type UploadConfig = { url: string; publishableKey: string };

export function validateImageFile(file: File): void {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPEG, PNG or WebP image.");
  if (file.size < 1 || file.size > 10 * 1024 * 1024)
    throw new Error("Choose an image from 1 byte through 10 MiB.");
}
