import { z } from "zod";
import { requestJson } from "@/src/api/client";
import {
  projectDraftSchema,
  projectRecordSchema,
  type ProjectDraft,
} from "./projects";

const collectionSchema = z.array(projectRecordSchema);
const path = (id: string) => `/api/admin/projects/${encodeURIComponent(id)}`;

export const projectApi = {
  list: (signal?: AbortSignal) =>
    requestJson("/api/admin/projects", collectionSchema, { signal }),
  /** The body replaces the whole order, so the response is the new collection. */
  order: (ids: readonly string[]) =>
    requestJson("/api/admin/projects/order", collectionSchema, {
      method: "PUT",
      body: { ids },
    }),
  /** intent "publish" performs the atomic first-publish create. */
  create: (draft: ProjectDraft, intent: "save" | "publish") =>
    requestJson("/api/admin/projects", projectRecordSchema, {
      method: "POST",
      body: { intent, draft },
    }),
  save: (id: string, draft: ProjectDraft) =>
    requestJson(path(id), projectRecordSchema, {
      method: "PUT",
      body: { draft },
    }),
  /** Validates, saves and publishes the submitted edits atomically. */
  publish: (id: string, draft: ProjectDraft) =>
    requestJson(`${path(id)}/published`, projectRecordSchema, {
      method: "PUT",
      body: { draft },
    }),
  /** Removes only the published snapshot; the saved draft is untouched. */
  unpublish: (id: string) =>
    requestJson(`${path(id)}/published`, projectDraftSchema, {
      method: "DELETE",
    }),
  remove: (id: string) =>
    requestJson(path(id), z.undefined(), { method: "DELETE" }),
};
