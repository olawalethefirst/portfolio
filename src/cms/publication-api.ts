import { z } from "zod";
import { requestJson } from "@/src/api/client";
import {
  publicationDraftSchema,
  publicationRecordSchema,
  type PublicationDraft,
} from "./publications";

const collectionSchema = z.array(publicationRecordSchema);
const path = (id: string) =>
  `/api/admin/publications/${encodeURIComponent(id)}`;

export const publicationApi = {
  list: (signal?: AbortSignal) =>
    requestJson("/api/admin/publications", collectionSchema, { signal }),
  /** The body replaces the whole order, so the response is the new collection. */
  order: (ids: readonly string[]) =>
    requestJson("/api/admin/publications/order", collectionSchema, {
      method: "PUT",
      body: { ids },
    }),
  /** intent "publish" performs the atomic first-publish create. */
  create: (draft: PublicationDraft, intent: "save" | "publish") =>
    requestJson("/api/admin/publications", publicationRecordSchema, {
      method: "POST",
      body: { intent, draft },
    }),
  save: (id: string, draft: PublicationDraft) =>
    requestJson(path(id), publicationRecordSchema, {
      method: "PUT",
      body: { draft },
    }),
  /** Validates, saves and publishes the submitted edits atomically. */
  publish: (id: string, draft: PublicationDraft) =>
    requestJson(`${path(id)}/published`, publicationRecordSchema, {
      method: "PUT",
      body: { draft },
    }),
  /** Removes only the published snapshot; the saved draft is untouched. */
  unpublish: (id: string) =>
    requestJson(`${path(id)}/published`, publicationDraftSchema, {
      method: "DELETE",
    }),
  remove: (id: string) =>
    requestJson(path(id), z.undefined(), { method: "DELETE" }),
};
