import { requestJson } from "@/src/api/client";
import type { ApiIssue } from "@/src/api/errors";
import { mapIssueFeedback } from "./issue-feedback";
import { socialSchema, type SocialDraft } from "./social";

export const socialApi = {
  read: (signal?: AbortSignal) =>
    requestJson("/api/admin/social", socialSchema, { signal }),
  save: (body: SocialDraft) =>
    requestJson("/api/admin/social", socialSchema, { method: "PUT", body }),
};
const issueFields: ReadonlyMap<string, keyof SocialDraft> = new Map([
  ["/github", "github"],
  ["/linkedin", "linkedin"],
  ["/x", "x"],
]);

/** Map only known request pointers; unknown issues remain form-level feedback. */
export function socialIssueFeedback(issues: ApiIssue[] = []) {
  return mapIssueFeedback(issues, issueFields);
}
