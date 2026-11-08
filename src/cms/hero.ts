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
