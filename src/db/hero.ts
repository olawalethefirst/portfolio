import "server-only";
import { eq } from "drizzle-orm";
import { pgTable, smallint, text } from "drizzle-orm/pg-core";
import type { HeroDraft } from "@/src/cms/hero";
import { getDb } from "./client";

// Query mapping only; supabase/migrations remains the schema authority.
const heroContent = pgTable("hero_content", {
  id: smallint("id").primaryKey(),
  eyebrow: text("eyebrow").notNull(), headline: text("headline").notNull(),
  ideaTagline: text("idea_tagline").notNull(), ideaDescription: text("idea_description").notNull(),
  iterateTagline: text("iterate_tagline").notNull(), iterateDescription: text("iterate_description").notNull(),
  solutionTagline: text("solution_tagline").notNull(), solutionDescription: text("solution_description").notNull(),
});

function content(row: typeof heroContent.$inferSelect): HeroDraft {
  return {
    eyebrow: row.eyebrow, headline: row.headline,
    stages: {
      idea: { tagline: row.ideaTagline, description: row.ideaDescription },
      iterate: { tagline: row.iterateTagline, description: row.iterateDescription },
      solution: { tagline: row.solutionTagline, description: row.solutionDescription },
    },
  };
}

export async function readHero(): Promise<HeroDraft | null> {
  const [row] = await getDb().select().from(heroContent).where(eq(heroContent.id, 1));
  return row ? content(row) : null;
}

export async function updateHero(value: HeroDraft): Promise<HeroDraft | null> {
  const [row] = await getDb().update(heroContent).set({
    eyebrow: value.eyebrow, headline: value.headline,
    ideaTagline: value.stages.idea.tagline, ideaDescription: value.stages.idea.description,
    iterateTagline: value.stages.iterate.tagline, iterateDescription: value.stages.iterate.description,
    solutionTagline: value.stages.solution.tagline, solutionDescription: value.stages.solution.description,
  }).where(eq(heroContent.id, 1)).returning();
  return row ? content(row) : null;
}
