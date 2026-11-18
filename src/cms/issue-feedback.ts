import { ApiRequestError } from "@/src/api/client";
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

/**
 * The message for a failed save. A lost response proves nothing about the
 * write, so it reads as unconfirmed; server failures keep their own message
 * followed by any issues that matched no field.
 */
export function saveErrorMessage(
  failure: Error,
  general: readonly string[],
): string {
  const message =
    failure instanceof ApiRequestError && failure.kind !== "server"
      ? "Couldn’t confirm the save."
      : failure.message;
  return [message, ...general].join(" ");
}
