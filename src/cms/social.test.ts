import { expect, it } from "vitest";
import { emptySocial, initialSocial, socialProfileHref, validateSocial } from "./social";
const image = "data:image/png;base64,aW1hZ2U=";
it.each(["", "  ", "/profile", "javascript:alert(1)", "data:text/html,hello", "http://github.com/profile", "https:github.com/profile", "https://user:password@github.com/profile", "https://github.com/my profile"])("rejects an unsafe profile destination: %s", (url) => {
  expect(socialProfileHref(url)).toBeUndefined();
  expect(validateSocial({ name: "Profile", url, imageSrc: image }).url).toBeTruthy();
});
it("accepts custom names, images and HTTPS hosts while preserving entered text", () => {
  const value = { name: "My community", url: "  https://community.example.com/me  ", imageSrc: image };
  expect(validateSocial(value)).toEqual({});
  expect(socialProfileHref(value.url)).toBe("https://community.example.com/me");
  expect(value.url).toBe("  https://community.example.com/me  ");
});
it("requires a name and uploaded image for custom profiles and preserves built-in seed icons", () => {
  expect(validateSocial(emptySocial()).name).toBeTruthy();
  expect(validateSocial({ name: "Community", url: "https://example.com", imageSrc: "" }).imageSrc).toBeTruthy();
  expect(validateSocial({ name: "Community", url: "https://example.com", imageSrc: "data:image/svg+xml,bad" }).imageSrc).toBeTruthy();
  for (const profile of initialSocial()) expect(validateSocial(profile)).toEqual({});
});
