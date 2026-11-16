import "server-only";
import type { ApiError, ApiIssue } from "@/src/api/errors";
import { toApiIssues } from "@/src/api/zod-issues";
import {
  createAndPublishPublication as persistFirstPublish,
  deletePublishedPublication,
  saveAndPublishPublication,
} from "@/src/db/publications";
import {
  createPublicationPublishSchema,
  type PublicationDraft,
  type PublicationRecord,
} from "./publications";

type PublicationWriteResult =
  | { ok: true; content: PublicationRecord }
  | { ok: false; error: ApiError };
type PublicationUnpublishResult =
  | { ok: true; content: PublicationDraft }
  | { ok: false; error: ApiError };

function invalid(issues: ApiIssue[]): PublicationWriteResult {
  return {
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Check the highlighted fields.",
      issues,
    },
  };
}

function currentDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function publishPublication(
  id: string,
  value: PublicationDraft,
  today: string = currentDate(),
): Promise<PublicationWriteResult> {
  const result = createPublicationPublishSchema(today).safeParse(value);
  if (!result.success) return invalid(toApiIssues(result.error.issues));
  const content = await saveAndPublishPublication(id, result.data);
  return content
    ? { ok: true, content }
    : {
        ok: false,
        error: { code: "NOT_FOUND", message: "Publication was not found." },
      };
}

export async function createAndPublishPublication(
  value: PublicationDraft,
  today: string = currentDate(),
): Promise<PublicationWriteResult> {
  const result = createPublicationPublishSchema(today).safeParse(value);
  if (!result.success) return invalid(toApiIssues(result.error.issues));
  return { ok: true, content: await persistFirstPublish(result.data) };
}

export async function unpublishPublication(
  id: string,
): Promise<PublicationUnpublishResult> {
  const content = await deletePublishedPublication(id);
  return content
    ? { ok: true, content }
    : {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Published Publication was not found.",
        },
      };
}
