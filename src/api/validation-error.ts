import type { ZodError } from "zod";
import { apiErrorResponse } from "./errors";
import { toApiIssues } from "./zod-issues";

/** Preserve structural 400s and field-specific 422s from one request parse. */
export function validationErrorResponse(error: ZodError, structuralMessage: string) {
  const structural = error.issues.some((issue) =>
    issue.code === "invalid_type" || issue.code === "invalid_value" ||
    issue.code === "unrecognized_keys",
  );
  return apiErrorResponse(structural
    ? { code: "INVALID_REQUEST", message: structuralMessage }
    : {
        code: "VALIDATION_ERROR",
        message: "Check the highlighted fields.",
        issues: toApiIssues(error.issues),
      });
}
