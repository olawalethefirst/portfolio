import { z } from "zod";

const seoValuesSchema = z.object({ title: z.string(), description: z.string() });
export const seoDefaultsSchema = seoValuesSchema.extend({
  title: z.string().refine((value) => Boolean(value.trim()), "Enter a default SEO title."),
  description: z.string().refine((value) => Boolean(value.trim()), "Enter a default SEO description."),
});
const seoRecordSchema = seoValuesSchema.extend({ id: z.string(), path: z.string() });
export type SeoValues = z.infer<typeof seoValuesSchema>;
export type SeoRecord = z.infer<typeof seoRecordSchema>;
export interface SeoState { defaults: SeoValues; records: SeoRecord[] }
export type SeoErrors = Partial<Record<"path" | "title" | "description", string>>;
export const emptySeoOverride = (): SeoValues => ({ title: "", description: "" });
export function initialSeo(): SeoState {
  return {
    defaults: { title: "Portfolio", description: "Interactive portfolio and publication previews." },
    records: [
      { id: "contact", path: "/contact", title: "Contact", description: "Start a conversation about a project, collaboration, or question." },
      { id: "article", path: "/publication-details-lab", title: "Publication Details Lab", description: "A publication details layout lab for long-form, Markdown-authored writing." },
    ],
  };
}
export function resolveSeo(defaults: SeoValues, override: SeoValues) {
  return {
    title: override.title.trim() || defaults.title.trim(),
    description: override.description.trim() || defaults.description.trim(),
    titleSource: override.title.trim() ? "Override" : "Default",
    descriptionSource: override.description.trim() ? "Override" : "Default",
  };
}
export const sameSeoValues = (a: SeoValues, b: SeoValues) => a.title === b.title && a.description === b.description;
export const sameSeoRecord = (a: SeoRecord, b: SeoRecord) => a.path === b.path && sameSeoValues(a, b);

export function normalizeSeoPath(value: string): string | undefined {
  if (!value.startsWith("/") || value.includes("//") || /[?#\\\s*\[\]]/.test(value)) return;
  if (value === "/") return "/";
  const segments = value.slice(1).replace(/\/$/, "").split("/");
  try {
    for (const segment of segments) {
      const decoded = decodeURIComponent(segment);
      if (!decoded || decoded === "." || decoded === ".." || decoded.startsWith(":") || /[\\/\s*\[\]\u0000-\u001f\u007f]/.test(decoded)) return;
    }
  } catch { return; }
  // Canonicalize equivalent unreserved characters for uniqueness without
  // letting a URL parser silently resolve dot segments or encoded separators.
  return "/" + segments.join("/").replace(/%([0-9a-f]{2})/gi, (_, hex: string) => {
    const character = String.fromCharCode(parseInt(hex, 16));
    return /[A-Za-z0-9._~-]/.test(character) ? character : `%${hex.toUpperCase()}`;
  });
}
export function createSeoRecordSchema(records: readonly SeoRecord[]) {
  return seoRecordSchema.superRefine((value, context) => {
    const path = normalizeSeoPath(value.path);
    if (!path) {
      context.addIssue({ code: "custom", path: ["path"], message: "Enter an exact site path starting with /, without a query, fragment or route pattern." });
    } else if (records.some((record) => record.id !== value.id && normalizeSeoPath(record.path) === path)) {
      context.addIssue({ code: "custom", path: ["path"], message: "An SEO override already exists for this path." });
    }
    if (!value.title.trim() && !value.description.trim()) {
      context.addIssue({ code: "custom", path: ["title"], message: "Enter at least one title or description override." });
    }
  });
}

export function validateSeoDefaults(value: SeoValues): SeoErrors {
  const result = seoDefaultsSchema.safeParse(value);
  if (result.success) return {};
  const { fieldErrors } = z.flattenError(result.error);
  const errors: SeoErrors = {};
  if (fieldErrors.title?.[0]) errors.title = fieldErrors.title[0];
  if (fieldErrors.description?.[0]) errors.description = fieldErrors.description[0];
  return errors;
}
export function validateSeoRecord(value: SeoRecord, records: SeoRecord[]): SeoErrors {
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
