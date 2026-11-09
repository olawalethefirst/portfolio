import { z } from "zod";
import { CONTENT_LIMITS } from "@/src/config/content-limits";

const limits = CONTENT_LIMITS.publication;
export const publicationDraftSchema = z.object({
  title: z.string(), summary: z.string(), kind: z.enum(["local", "external"]),
  bodyMarkdown: z.string(), externalUrl: z.string(), coverSrc: z.string(),
  coverAlt: z.string(), decorativeCover: z.boolean(), tagsText: z.string(), publishedOn: z.string(),
});
export type PublicationDraft = z.infer<typeof publicationDraftSchema>;

export interface PublicationRecord {
  id: string;
  draft: PublicationDraft;
  published: PublicationDraft | null;
}

export type PublicationAction = "save" | "publish" | "unpublish";
export type PublicationErrors = Partial<Record<keyof PublicationDraft, string>>;

export function emptyPublication(): PublicationDraft {
  return {
    title: "",
    summary: "",
    kind: "local",
    bodyMarkdown: "",
    externalUrl: "",
    coverSrc: "",
    coverAlt: "",
    decorativeCover: false,
    tagsText: "",
    publishedOn: "",
  };
}

export function samePublication(a: PublicationDraft, b: PublicationDraft) {
  return (Object.keys(a) as (keyof PublicationDraft)[]).every(
    (key) => a[key] === b[key],
  );
}

export function publicationState(record: PublicationRecord) {
  if (!record.published) return "Draft";
  return samePublication(record.draft, record.published)
    ? "Published"
    : "Published · Unpublished changes";
}

export function applyPublicationAction(
  record: PublicationRecord,
  submitted: PublicationDraft,
  action: PublicationAction,
): PublicationRecord {
  if (action === "unpublish") return { ...record, published: null };
  return {
    ...record,
    draft: { ...submitted },
    published: action === "publish" ? { ...submitted } : record.published,
  };
}

export function publicationTags(text: string) {
  const seen = new Set<string>();
  return text
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => {
      if (!tag || seen.has(tag.toLowerCase())) return false;
      seen.add(tag.toLowerCase());
      return true;
    });
}

export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function httpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function createPublicationPublishSchema(today: string) {
  return publicationDraftSchema.extend({
    title: z.string().refine((value) => Boolean(value.trim()), "Add a title before publishing.")
      .max(limits.title, `Use ${limits.title} characters or fewer.`),
    summary: z.string().refine((value) => Boolean(value.trim()), "Add a summary before publishing.")
      .max(limits.summary, `Use ${limits.summary} characters or fewer.`),
  }).superRefine((value, context) => {
    const issue = (field: keyof PublicationDraft, message: string) => context.addIssue({ code: "custom", path: [field], message });
    if (value.kind === "local" && !value.bodyMarkdown.trim()) issue("bodyMarkdown", "Write your article before publishing.");
    if (value.kind === "external" && !httpsUrl(value.externalUrl)) issue("externalUrl", "Enter a complete HTTPS destination.");
    const tags = publicationTags(value.tagsText);
    if (tags.some((tag) => tag.length > limits.tagLength)) issue("tagsText", `Use ${limits.tagLength} characters or fewer per tag.`);
    if (tags.length > limits.tagCount) issue("tagsText", `Use ${limits.tagCount} tags or fewer.`);
    if (!value.coverSrc) issue("coverSrc", "Choose a cover image.");
    if (!value.decorativeCover && !value.coverAlt.trim()) issue("coverAlt", "Describe the cover, or mark it as decorative.");
    if (!validDate(value.publishedOn)) issue("publishedOn", "Choose a valid publication date.");
    else if (value.publishedOn > today) issue("publishedOn", "Scheduling is not supported. Choose today or an earlier date.");
  });
}

export function validatePublication(value: PublicationDraft, today: string): PublicationErrors {
  const result = createPublicationPublishSchema(today).safeParse(value);
  if (result.success) return {};
  const { fieldErrors } = z.flattenError(result.error);
  const errors: PublicationErrors = {};
  for (const field of ["title", "summary", "bodyMarkdown", "externalUrl", "tagsText", "coverSrc", "coverAlt", "publishedOn", "kind", "decorativeCover"] as const) {
    const message = fieldErrors[field]?.[0];
    if (message) errors[field] = message;
  }
  return errors;
}
