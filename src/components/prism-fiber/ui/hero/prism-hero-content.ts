import type { PrismState } from "../../state/prism-state";

export interface PrismHeroStateContent {
  readonly tagline: string;
  readonly description: string;
}

export interface PrismHeroContent {
  eyebrow: string;
  headline: string;
  stages: Record<PrismState, PrismHeroStateContent>;
}

export const PRISM_HERO_TITLE = "Ideas into products.";

export const PRISM_HERO_CONTENT = {
  idea: {
    tagline: "Find the right problem.",
    description: "Align user needs, business goals, and technical reality.",
  },
  iterate: {
    tagline: "Make uncertainty testable.",
    description: "Test working ideas early and refine what matters.",
  },
  solution: {
    tagline: "Ship with confidence.",
    description: "Deliver a coherent product built to evolve.",
  },
} satisfies Record<PrismState, PrismHeroStateContent>;

export const PRISM_HERO_DEFAULT_CONTENT = {
  eyebrow: "Product delivery",
  headline: PRISM_HERO_TITLE,
  stages: PRISM_HERO_CONTENT,
} satisfies PrismHeroContent;
