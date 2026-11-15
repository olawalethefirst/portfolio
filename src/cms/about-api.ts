import { requestJson } from "@/src/api/client";
import type { ApiIssue } from "@/src/api/errors";
import { mapIssueFeedback } from "./issue-feedback";
import { aboutSchema, type AboutDraft } from "./about";

export const aboutApi = {
  read: (signal?: AbortSignal) =>
    requestJson("/api/admin/about", aboutSchema, { signal }),
  save: (body: AboutDraft) =>
    requestJson("/api/admin/about", aboutSchema, { method: "PUT", body }),
};
const issueFields: ReadonlyMap<string, keyof AboutDraft> = new Map([
  ["/heading", "heading"],
  ["/biography", "biography"],
]);

/** Map only known request pointers; unknown issues remain form-level feedback. */
export function aboutIssueFeedback(issues: ApiIssue[] = []) {
  return mapIssueFeedback(issues, issueFields);
}
