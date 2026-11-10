import { expect, it } from "vitest";
import { initialHero, validateHero } from "./hero";

const limits = [
  ["eyebrow", 16], ["headline", 20],
  ["idea-tagline", 26], ["idea-description", 56],
  ["iterate-tagline", 26], ["iterate-description", 56],
  ["solution-tagline", 26], ["solution-description", 56],
] as const;
it.each(limits)("enforces the exact %s budget of %i without rewriting content", (field, max) => {
  const draft = structuredClone(initialHero);
  const set = (text: string) => {
    if (field === "eyebrow" || field === "headline") draft[field] = text;
    else {
      const [stage, key] = field.split("-") as [keyof typeof draft.stages, "tagline" | "description"];
      draft.stages[stage][key] = text;
    }
  };
  set("a".repeat(max));
  expect(validateHero(draft)[field]).toBeUndefined();
  set("a".repeat(max + 1));
  expect(validateHero(draft)[field]).toBe(`Use ${max} characters or fewer.`);
  set(" ");
  expect(validateHero(draft)[field]).toBe("Complete this field before saving.");
});
