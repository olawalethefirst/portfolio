import { z } from "zod";
import { requestJson } from "@/src/api/client";
import { publicationRecordSchema } from "./publications";

const collectionSchema = z.array(publicationRecordSchema);

export const publicationApi = {
  list: (signal?: AbortSignal) =>
    requestJson("/api/admin/publications", collectionSchema, { signal }),
  /** The body replaces the whole order, so the response is the new collection. */
  order: (ids: readonly string[]) =>
    requestJson("/api/admin/publications/order", collectionSchema, {
      method: "PUT",
      body: { ids },
    }),
};
