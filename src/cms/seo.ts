import { z } from "zod";
import { normalizeSeoPath, seoDefaultsSchema, seoOverrideSchema, type SeoValues, type SeoRecord } from "@/src/seo/content";
export { normalizeSeoPath, resolveSeo, seoDefaultsSchema, seoRecordSchema, type SeoValues, type SeoRecord } from "@/src/seo/content";

export interface SeoState {
  defaults: SeoValues;
  records: SeoRecord[];
}
export type SeoErrors = Partial<
  Record<"path" | "title" | "description", string>
>;
export const emptySeoOverride = (): SeoValues => ({
  title: "",
  description: "",
});
export function initialSeo(): SeoState {
  return {
    defaults: {
      title: "Portfolio",
      description: "Interactive portfolio and publication previews.",
    },
    records: [
      {
        id: "contact",
        path: "/contact",
        title: "Contact",
        description:
          "Start a conversation about a project, collaboration, or question.",
      },
      {
        id: "article",
        path: "/publication-details-lab",
        title: "Publication Details Lab",
        description:
          "A publication details layout lab for long-form, Markdown-authored writing.",
      },
    ],
  };
}
export const sameSeoValues = (a: SeoValues, b: SeoValues) =>
  a.title === b.title && a.description === b.description;
export const sameSeoRecord = (a: SeoRecord, b: SeoRecord) =>
  a.path === b.path && sameSeoValues(a, b);

export function createSeoRecordSchema(records: readonly SeoRecord[]) {
  return seoOverrideSchema.safeExtend({ id: z.string() }).superRefine((value, context) => {
    const path = normalizeSeoPath(value.path);
    if (path && records.some((record) => record.id !== value.id && normalizeSeoPath(record.path) === path)) {
      context.addIssue({ code: "custom", path: ["path"], message: "An SEO override already exists for this path." });
    }
  });
}

export function validateSeoDefaults(value: SeoValues): SeoErrors {
  const result = seoDefaultsSchema.safeParse(value);
  if (result.success) return {};
  const { fieldErrors } = z.flattenError(result.error);
  const errors: SeoErrors = {};
  if (fieldErrors.title?.[0]) errors.title = fieldErrors.title[0];
  if (fieldErrors.description?.[0])
    errors.description = fieldErrors.description[0];
  return errors;
}
export function validateSeoRecord(
  value: SeoRecord,
  records: SeoRecord[],
): SeoErrors {
  const result = createSeoRecordSchema(records).safeParse(value);
  if (result.success) return {};
  const { fieldErrors } = z.flattenError(result.error);
  const errors: SeoErrors = {};
  for (const field of ["path", "title", "description"] as const) {
    const message = fieldErrors[field]?.[0];
    if (message) errors[field] = message;
  }
  return errors;
}
