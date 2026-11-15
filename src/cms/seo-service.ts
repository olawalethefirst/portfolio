import "server-only";
import { DrizzleQueryError } from "drizzle-orm";
import type { ApiError, ApiIssue } from "@/src/api/errors";
import { toApiIssues } from "@/src/api/zod-issues";
import { deleteSeoOverride, insertSeo, readSeo, updateSeo } from "@/src/db/seo";
import {
  normalizeSeoPath, seoDefaultInputSchema, seoOverrideSchema,
  type SeoInput, type SeoRecord,
} from "@/src/seo/content";

type SeoResult = { ok: true; content: SeoRecord } | { ok: false; error: ApiError };

function validate(value: SeoInput, current?: SeoRecord): ApiIssue[] {
  const schema = current?.path === "/" ? seoDefaultInputSchema : seoOverrideSchema;
  const result = schema.safeParse(value);
  const issues: ApiIssue[] = result.success ? [] : toApiIssues(result.error.issues);
  if (current?.path !== "/" && normalizeSeoPath(value.path) === "/") issues.push({
    pointer: "/path", message: "The / path is reserved for the existing SEO defaults.",
  });
  return issues;
}

function invalid(issues: ApiIssue[]): SeoResult {
  return { ok: false, error: {
    code: "VALIDATION_ERROR", message: "Check the highlighted fields.", issues,
  } };
}

function missing(): SeoResult {
  return { ok: false, error: { code: "NOT_FOUND", message: "SEO content was not found." } };
}

async function persist(operation: () => Promise<SeoRecord | null>): Promise<SeoResult> {
  try {
    const content = await operation();
    return content ? { ok: true, content } : missing();
  } catch (failure) {
    const cause = failure instanceof DrizzleQueryError ? failure.cause : failure;
    if (typeof cause === "object" && cause !== null &&
      "code" in cause && cause.code === "23505" &&
      "constraint_name" in cause && cause.constraint_name === "seo_path_key") {
      const message = "An SEO override already exists for this path.";
      return { ok: false, error: {
        code: "CONFLICT", message, issues: [{ pointer: "/path", message }],
      } };
    }
    throw failure;
  }
}

function capture(value: SeoInput): SeoInput {
  return { path: value.path, title: value.title, description: value.description };
}

export async function createSeo(value: SeoInput): Promise<SeoResult> {
  const submitted = capture(value);
  const errors = validate(submitted);
  if (errors.length) return invalid(errors);
  const path = normalizeSeoPath(submitted.path);
  if (!path) return invalid([{ pointer: "/path", message: "Enter a valid site path." }]);
  return persist(() => insertSeo({ ...submitted, path }));
}

export async function saveSeo(id: string, value: SeoInput): Promise<SeoResult> {
  const submitted = capture(value);
  const current = await readSeo(id);
  if (!current) return missing();
  const errors = validate(submitted, current);
  if (errors.length) return invalid(errors);
  const path = normalizeSeoPath(submitted.path);
  if (!path) return invalid([{ pointer: "/path", message: "Enter a valid site path." }]);
  return persist(() => updateSeo(id, { ...submitted, path }));
}

export async function deleteSeo(id: string): Promise<SeoResult> {
  const current = await readSeo(id);
  if (!current) return missing();
  if (current.path === "/") return { ok: false, error: {
    code: "CONFLICT", message: "The default SEO record cannot be deleted.",
  } };
  const content = await deleteSeoOverride(id);
  return content ? { ok: true, content } : missing();
}
