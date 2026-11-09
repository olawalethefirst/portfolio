import { z } from "zod";
import { ABOUT_DEFAULT_CONTENT } from "@/src/components/about-cta/about-content";

const nonblank = z.string().refine((value) => Boolean(value.trim()), "Complete this field before saving.");
export const aboutDraftSchema = z.object({ heading: z.string(), biography: z.string() });
export const aboutSchema = z.object({ heading: nonblank, biography: nonblank });
export type AboutDraft = z.infer<typeof aboutSchema>;
export type AboutErrors = Partial<Record<keyof AboutDraft, string>>;
export const initialAbout: AboutDraft = { ...ABOUT_DEFAULT_CONTENT };
export const sameAbout = (a: AboutDraft, b: AboutDraft) => a.heading === b.heading && a.biography === b.biography;
export function validateAbout(value: AboutDraft): AboutErrors {
  const result = aboutSchema.safeParse(value);
  if (result.success) return {};
  const { fieldErrors } = z.flattenError(result.error);
  return { heading: fieldErrors.heading?.[0], biography: fieldErrors.biography?.[0] };
}
