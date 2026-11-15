"use client";
import { useMutation } from "@tanstack/react-query";
import { uploadImage } from "./upload-client";
import type { UploadConfig } from "./upload-reference";

/** Mutation state owns pending, errors and the File available for explicit Retry. */
export function useImageUpload(config: UploadConfig) {
  return useMutation({
    mutationFn: (file: File) => uploadImage(file, config),
    retry: false,
    networkMode: "always",
  });
}
