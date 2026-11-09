import { z } from "zod";
import { CONTENT_LIMITS } from "@/src/config/content-limits";
import { PRISM_HERO_DEFAULT_CONTENT } from "@/src/components/prism-fiber/ui/hero/prism-hero-content";

const limits = CONTENT_LIMITS.hero;
const text = (max: number) => z.string()
  .refine((value) => Boolean(value.trim()), "Complete this field before saving.")
  .max(max, `Use ${max} characters or fewer.`);
const draftStageSchema = z.object({ tagline: z.string(), description: z.string() });
export const heroDraftSchema = z.object({
  eyebrow: z.string(), headline: z.string(),
  stages: z.object({ idea: draftStageSchema, iterate: draftStageSchema, solution: draftStageSchema }),
});
const stageSchema = z.object({ tagline: text(limits.stage.tagline), description: text(limits.stage.description) });
export const heroSchema = z.object({
  eyebrow: text(limits.eyebrow),
  headline: text(limits.headline),
  stages: z.object({
    idea: stageSchema,
    iterate: stageSchema,
    solution: stageSchema,
  }),
});
export type HeroDraft = z.infer<typeof heroSchema>;
export type HeroStageContent = HeroDraft["stages"]["idea"];
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

export type HeroField = "eyebrow" | "headline" | `${keyof HeroDraft["stages"]}-${keyof HeroStageContent}`;
export type HeroErrors = Partial<Record<HeroField, string>>;

export function validateHero(value: HeroDraft): HeroErrors {
  const result = heroSchema.safeParse(value);
  if (result.success) return {};
  const tree = z.treeifyError(result.error);
  const errors: HeroErrors = {};
  for (const field of ["eyebrow", "headline"] as const) {
    const message = tree.properties?.[field]?.errors[0];
    if (message) errors[field] = message;
  }
  for (const stage of ["idea", "iterate", "solution"] as const) {
    for (const field of ["tagline", "description"] as const) {
      const message = tree.properties?.stages?.properties?.[stage]?.properties?.[field]?.errors[0];
      if (message) errors[`${stage}-${field}`] = message;
    }
  }
  return errors;
}
