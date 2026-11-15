import "server-only";
import type { ApiError, ApiIssue } from "@/src/api/errors";
import { insertProject, updateProject } from "@/src/db/projects";
import {
  projectDraftSchema,
  type ProjectDraft,
  type ProjectRecord,
} from "./projects";

type ProjectWriteResult =
  | { ok: true; content: ProjectRecord }
  | { ok: false; error: ApiError };

function invalid(issues: ApiIssue[]): ProjectWriteResult {
  return {
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Check the highlighted fields.",
      issues,
    },
  };
}

function validate(value: ProjectDraft): ApiIssue[] {
  const result = projectDraftSchema.safeParse(value);
  return result.success
    ? []
    : result.error.issues.map((issue) => ({
        pointer:
          "/" +
          issue.path
            .map((part) =>
              String(part).replaceAll("~", "~0").replaceAll("/", "~1"),
            )
            .join("/"),
        message: issue.message,
      }));
}

export async function createProject(
  value: ProjectDraft,
): Promise<ProjectWriteResult> {
  const issues = validate(value);
  if (issues.length) return invalid(issues);
  return { ok: true, content: await insertProject(value) };
}

export async function saveProject(
  id: string,
  value: ProjectDraft,
): Promise<ProjectWriteResult> {
  const issues = validate(value);
  if (issues.length) return invalid(issues);
  const content = await updateProject(id, value);
  return content
    ? { ok: true, content }
    : {
        ok: false,
        error: { code: "NOT_FOUND", message: "Project was not found." },
      };
}
