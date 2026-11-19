import { z } from "zod";
import { CONTENT_LIMITS } from "@/src/config/content-limits";
import { labProjects } from "@/src/components/project-item/lab-projects";
import { httpsUrl, publicationTags } from "./publications";

const limits = CONTENT_LIMITS.project;
export const projectDraftSchema = z.object({
  name: z.string(),
  summary: z.string(),
  what: z.string(),
  how: z.string(),
  platform: z.enum(["mobile", "web"]),
  tagsText: z.string(),
  screenshot: z.string(),
  screenshotAlt: z.string(),
  liveUrl: z.string(),
});
const requiredText = () =>
  z
    .string()
    .refine(
      (value) => Boolean(value.trim()),
      "Complete this field before publishing.",
    );
export const projectPublishSchema = projectDraftSchema
  .extend({
    name: requiredText().max(
      limits.name,
      `Use ${limits.name} characters or fewer.`,
    ),
    summary: requiredText().max(
      limits.summary,
      `Use ${limits.summary} characters or fewer.`,
    ),
    what: requiredText().max(
      limits.what,
      `Use ${limits.what} characters or fewer.`,
    ),
    how: requiredText().max(
      limits.how,
      `Use ${limits.how} characters or fewer.`,
    ),
    screenshot: requiredText(),
    liveUrl: z.string().refine(httpsUrl, "Enter a complete HTTPS destination."),
  })
  .superRefine((value, context) => {
    const tags = publicationTags(value.tagsText);
    if (tags.some((tag) => tag.length > limits.tagLength))
      context.addIssue({
        code: "custom",
        path: ["tagsText"],
        message: `Use ${limits.tagLength} characters or fewer per tag.`,
      });
    if (tags.length > limits.tagCount)
      context.addIssue({
        code: "custom",
        path: ["tagsText"],
        message: `Use ${limits.tagCount} tags or fewer.`,
      });
    if (!value.screenshotAlt.trim()) {
      context.addIssue({
        code: "custom",
        path: ["screenshotAlt"],
        message: "Describe the screenshot.",
      });
    }
  });
export type ProjectDraft = z.infer<typeof projectDraftSchema>;
/**
 * Shape accepted when restoring a browser working draft. Drafts saved before
 * tags existed have no `tagsText`; restore them with empty tags, not as errors.
 */
export const storedProjectDraftSchema = projectDraftSchema.extend({
  tagsText: z.string().default(""),
});
export interface ProjectRecord {
  id: string;
  draft: ProjectDraft;
  published: ProjectDraft | null;
}
export const projectRecordSchema = z.object({
  id: z.uuid(),
  draft: projectDraftSchema,
  published: projectDraftSchema.nullable(),
});
export interface PublishedProject extends ProjectDraft {
  id: string;
}
export type ProjectAction = "save" | "publish" | "unpublish" | "delete";
export type ProjectErrors = Partial<Record<keyof ProjectDraft, string>>;
export function emptyProject(): ProjectDraft {
  return {
    name: "",
    summary: "",
    what: "",
    how: "",
    platform: "web",
    tagsText: "",
    screenshot: "",
    screenshotAlt: "",
    liveUrl: "",
  };
}
export function initialProjects(): ProjectRecord[] {
  return labProjects.map((item) => {
    const draft: ProjectDraft = {
      name: item.name,
      summary: item.summary,
      what: item.what,
      how: item.how,
      platform: item.platform,
      tagsText: item.tags.join(", "),
      screenshot: item.screenTextureSrc ?? "",
      screenshotAlt: `${item.name} interface`,
      liveUrl: item.liveHref,
    };
    return { id: item.id, draft, published: { ...draft } };
  });
}
export function sameProject(a: ProjectDraft, b: ProjectDraft) {
  return (Object.keys(a) as (keyof ProjectDraft)[]).every(
    (key) => a[key] === b[key],
  );
}
export function projectStatus(record: ProjectRecord) {
  if (!record.published) return "Draft";
  return sameProject(record.draft, record.published)
    ? "Published"
    : "Published · Unpublished changes";
}
export function validateProject(value: ProjectDraft): ProjectErrors {
  const result = projectPublishSchema.safeParse(value);
  if (result.success) return {};
  const { fieldErrors } = z.flattenError(result.error);
  const errors: ProjectErrors = {};
  for (const field of Object.keys(fieldErrors) as (keyof ProjectDraft)[]) {
    const message = fieldErrors[field]?.[0];
    if (message) errors[field] = message;
  }
  return errors;
}
