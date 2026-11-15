import { z } from "zod";
import { requestJson } from "@/src/api/client";
import type { ApiIssue } from "@/src/api/errors";
import { mapIssueFeedback } from "./issue-feedback";
import { seoRecordSchema, type SeoInput } from "@/src/seo/content";

const collectionSchema = z.array(seoRecordSchema);

export const seoApi = {
  remove: (id: string) =>
    requestJson(`/api/admin/seo/${encodeURIComponent(id)}`, z.undefined(), {
      method: "DELETE",
    }),
  save: (id: string, body: SeoInput) =>
    requestJson(`/api/admin/seo/${encodeURIComponent(id)}`, seoRecordSchema, { method: "PUT", body }),
  list: (signal?: AbortSignal) =>
    requestJson("/api/admin/seo", collectionSchema, { signal }),
  read: (id: string, signal?: AbortSignal) =>
    requestJson(`/api/admin/seo/${encodeURIComponent(id)}`, seoRecordSchema, {
      signal,
    }),
};

const issueFields: ReadonlyMap<string, keyof SeoInput> = new Map([
  ["/path", "path"], ["/title", "title"], ["/description", "description"],
]);
export function seoIssueFeedback(issues: ApiIssue[] = []) {
  return mapIssueFeedback(issues, issueFields);
}
