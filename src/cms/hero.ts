import { PRISM_HERO_DEFAULT_CONTENT } from "@/src/components/prism-fiber/ui/hero/prism-hero-content";

export interface HeroStageContent { tagline: string; description: string }
export interface HeroDraft {
  eyebrow: string;
  headline: string;
  stages: { idea: HeroStageContent; iterate: HeroStageContent; solution: HeroStageContent };
}
export const initialHero: HeroDraft = {
  ...PRISM_HERO_DEFAULT_CONTENT,
  stages: {
    idea: { ...PRISM_HERO_DEFAULT_CONTENT.stages.idea },
    iterate: { ...PRISM_HERO_DEFAULT_CONTENT.stages.iterate },
    solution: { ...PRISM_HERO_DEFAULT_CONTENT.stages.solution },
  },
};
export const sameHero = (a: HeroDraft, b: HeroDraft) =>
  JSON.stringify(a) === JSON.stringify(b);

type HeroField = "eyebrow" | "headline" | `${keyof HeroDraft["stages"]}-${keyof HeroStageContent}`;
export type HeroErrors = Partial<Record<HeroField, string>>;

export function validateHero(value: HeroDraft): HeroErrors {
  const errors: HeroErrors = {};
  for (const key of ["eyebrow", "headline"] as const) {
    if (!value[key].trim()) errors[key] = "Complete this field before saving.";
  }
  for (const stage of ["idea", "iterate", "solution"] as const) {
    for (const field of ["tagline", "description"] as const) {
      if (!value.stages[stage][field].trim()) errors[`${stage}-${field}`] = "Complete this field before saving.";
    }
  }
  return errors;
}
