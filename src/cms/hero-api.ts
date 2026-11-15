import { requestJson } from "@/src/api/client";
import type { ApiIssue } from "@/src/api/errors";
import { mapIssueFeedback } from "./issue-feedback";
import {
  heroSchema,
  type HeroDraft,
  type HeroField,
} from "./hero";

export const heroApi = {
  read: (signal?: AbortSignal) =>
    requestJson("/api/admin/hero", heroSchema, { signal }),
  save: (body: HeroDraft) =>
    requestJson("/api/admin/hero", heroSchema, { method: "PUT", body }),
};
const issueFields: ReadonlyMap<string, HeroField> = new Map([
  ["/eyebrow", "eyebrow"],
  ["/headline", "headline"],
  ["/stages/idea/tagline", "idea-tagline"],
  ["/stages/idea/description", "idea-description"],
  ["/stages/iterate/tagline", "iterate-tagline"],
  ["/stages/iterate/description", "iterate-description"],
  ["/stages/solution/tagline", "solution-tagline"],
  ["/stages/solution/description", "solution-description"],
]);

/** Map only known request pointers; unknown issues remain form-level feedback. */
export function heroIssueFeedback(issues: ApiIssue[] = []) {
  return mapIssueFeedback(issues, issueFields);
}
