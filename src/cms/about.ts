import { ABOUT_DEFAULT_CONTENT, type AboutContent } from "@/src/components/about-cta/about-content";

export type AboutDraft = AboutContent;
export type AboutErrors = Partial<Record<keyof AboutDraft, string>>;
export const initialAbout: AboutDraft = { ...ABOUT_DEFAULT_CONTENT };
export const sameAbout = (a: AboutDraft, b: AboutDraft) => a.heading === b.heading && a.biography === b.biography;
export function validateAbout(value: AboutDraft): AboutErrors {
  const errors: AboutErrors = {};
  for (const field of ["heading", "biography"] as const) {
    if (!value[field].trim()) errors[field] = "Complete this field before saving.";
  }
  return errors;
}
