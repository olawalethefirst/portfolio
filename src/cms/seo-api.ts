import { z } from "zod";
import { requestJson } from "@/src/api/client";
import { seoRecordSchema } from "@/src/seo/content";

const collectionSchema = z.array(seoRecordSchema);

export const seoApi = {
  list: (signal?: AbortSignal) =>
    requestJson("/api/admin/seo", collectionSchema, { signal }),
};
