import { expect, it } from "vitest";
import { initialSocial, socialProfileHref, validateSocial } from "./social";

it.each(["", "  ", "/profile", "javascript:alert(1)", "data:text/html,hello", "http://github.com/profile", "https:github.com/profile", "https://user:password@github.com/profile", "https://github.com/my profile"])("rejects a non-public HTTPS profile destination: %s", (value) => {
  expect(socialProfileHref(value)).toBeUndefined();
  expect(validateSocial({ ...initialSocial, github: value }).github).toBeTruthy();
});

it("accepts a complete HTTPS destination without restricting the host and preserves editor text", () => {
  const value = { ...initialSocial, github: "  https://code.example.com/profile  " };
  expect(validateSocial(value)).toEqual({});
  expect(socialProfileHref(value.github)).toBe("https://code.example.com/profile");
  expect(value.github).toBe("  https://code.example.com/profile  ");
});
