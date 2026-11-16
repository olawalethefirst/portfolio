import { z } from "zod";
import { requestJson } from "@/src/api/client";
import { projectRecordSchema } from "./projects";

const collectionSchema = z.array(projectRecordSchema);

export const projectApi = {
  list: (signal?: AbortSignal) =>
    requestJson("/api/admin/projects", collectionSchema, { signal }),
  /** The body replaces the whole order, so the response is the new collection. */
  order: (ids: readonly string[]) =>
    requestJson("/api/admin/projects/order", collectionSchema, {
      method: "PUT",
      body: { ids },
    }),
};
