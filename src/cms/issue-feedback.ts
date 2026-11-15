import type { ApiIssue } from "@/src/api/errors";

/** Keep the first known field error; preserve unknown issues as form feedback. */
export function mapIssueFeedback<Field extends string>(
  issues: readonly ApiIssue[],
  issueFields: ReadonlyMap<string, Field>,
) {
  const fields: Partial<Record<Field, string>> = {};
  const general: string[] = [];
  for (const issue of issues) {
    const field = issueFields.get(issue.pointer);
    if (field !== undefined) fields[field] ??= issue.message;
    else general.push(issue.message);
  }
  return { fields, general };
}
