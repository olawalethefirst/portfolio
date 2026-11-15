import { z } from "zod";

export const seoValuesSchema = z.object({ title: z.string(), description: z.string() });
export const seoInputSchema = seoValuesSchema.extend({ path: z.string() });
export const seoRecordSchema = seoInputSchema.extend({ id: z.string() });
export const seoDefaultsSchema = seoValuesSchema.extend({
  title: z.string().refine((value) => Boolean(value.trim()), "Enter a default SEO title."),
  description: z.string().refine((value) => Boolean(value.trim()), "Enter a default SEO description."),
});
export const seoDefaultInputSchema = seoDefaultsSchema.extend({
  path: z.literal("/", { error: "The default SEO path must remain /." }),
});
export type SeoValues = z.infer<typeof seoValuesSchema>;
export type SeoInput = z.infer<typeof seoInputSchema>;
export type SeoRecord = z.infer<typeof seoRecordSchema>;

export function resolveSeo(defaults: SeoValues, override: SeoValues) {
  return {
    title: override.title.trim() || defaults.title.trim(),
    description: override.description.trim() || defaults.description.trim(),
    titleSource: override.title.trim() ? "Override" : "Default",
    descriptionSource: override.description.trim() ? "Override" : "Default",
  };
}

export function normalizeSeoPath(value: string): string | undefined {
  if (
    !value.startsWith("/") ||
    value.includes("//") ||
    /[?#\\\s*\[\]]/.test(value)
  )
    return;
  if (value === "/") return "/";
  const segments = value.slice(1).replace(/\/$/, "").split("/");
  try {
    for (const segment of segments) {
      const decoded = decodeURIComponent(segment);
      if (
        !decoded ||
        decoded === "." ||
        decoded === ".." ||
        decoded.startsWith(":") ||
        /[\\/\s*\[\]\u0000-\u001f\u007f]/.test(decoded)
      )
        return;
    }
  } catch {
    return;
  }
  // Canonicalize equivalent unreserved characters for uniqueness without
  // letting a URL parser silently resolve dot segments or encoded separators.
  return (
    "/" +
    segments.join("/").replace(/%([0-9a-f]{2})/gi, (_, hex: string) => {
      const character = String.fromCharCode(parseInt(hex, 16));
      return /[A-Za-z0-9._~-]/.test(character)
        ? character
        : `%${hex.toUpperCase()}`;
    })
  );
}

export const seoOverrideSchema = seoInputSchema.superRefine((value, context) => {
  if (!normalizeSeoPath(value.path)) context.addIssue({
    code: "custom", path: ["path"],
    message: "Enter an exact site path starting with /, without a query, fragment or route pattern.",
  });
  if (!value.title.trim() && !value.description.trim()) context.addIssue({
    code: "custom", path: ["title"], message: "Enter at least one title or description override.",
  });
});
