import type { ApiIssue } from "./errors";

export function toApiIssues(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): ApiIssue[] {
  return issues.map((issue) => ({
    pointer: `/${issue.path.map(String).join("/")}`,
    message: issue.message,
  }));
}
