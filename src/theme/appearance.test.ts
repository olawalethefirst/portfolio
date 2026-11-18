import { expect, it } from "vitest";
import { MODE_COOKIE, THEME_COOKIE, parseAppearance } from "./appearance";

const reader = (cookies: Record<string, string>) => (name: string) => cookies[name];

it("reads valid explicit choices", () => {
  expect(parseAppearance(reader({ [THEME_COOKIE]: "forest", [MODE_COOKIE]: "light" }))).toEqual({
    theme: "forest",
    mode: "light",
  });
});

it("treats absent or unknown values as no choice", () => {
  expect(parseAppearance(reader({}))).toEqual({ theme: undefined, mode: undefined });
  expect(
    parseAppearance(reader({ [THEME_COOKIE]: "neon", [MODE_COOKIE]: "sepia" })),
  ).toEqual({ theme: undefined, mode: undefined });
});
