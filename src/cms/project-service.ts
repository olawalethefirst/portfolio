import "server-only";
import type { ApiError, ApiIssue } from "@/src/api/errors";
import { toApiIssues } from "@/src/api/zod-issues";
import {
  createAndPublishProject as persistFirstPublish,
  deletePublishedProject,
  saveAndPublishProject,
} from "@/src/db/projects";
import {
  projectPublishSchema,
  type ProjectDraft,
  type ProjectRecord,
} from "./projects";

type ProjectWriteResult =
  | { ok: true; content: ProjectRecord }
  | { ok: false; error: ApiError };
type ProjectUnpublishResult =
  | { ok: true; content: ProjectDraft }
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

export async function publishProject(
  id: string,
  value: ProjectDraft,
): Promise<ProjectWriteResult> {
  const result = projectPublishSchema.safeParse(value);
  if (!result.success) return invalid(toApiIssues(result.error.issues));
  const content = await saveAndPublishProject(id, result.data);
  return content
    ? { ok: true, content }
    : {
        ok: false,
        error: { code: "NOT_FOUND", message: "Project was not found." },
      };
}

export async function createAndPublishProject(
  value: ProjectDraft,
): Promise<ProjectWriteResult> {
  const result = projectPublishSchema.safeParse(value);
  if (!result.success) return invalid(toApiIssues(result.error.issues));
  return { ok: true, content: await persistFirstPublish(result.data) };
}

export async function unpublishProject(
  id: string,
): Promise<ProjectUnpublishResult> {
  const content = await deletePublishedProject(id);
  return content
    ? { ok: true, content }
    : {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Published Project was not found.",
        },
      };
}
