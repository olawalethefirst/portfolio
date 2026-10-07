import { afterEach, expect, it, vi } from "vitest";
import { readPrismAccentPalette } from "./prism-accent-palette";

afterEach(() => document.documentElement.removeAttribute("style"));
it("resolves the active CSS palette and rejects invalid converted output", () => {
  const style = document.documentElement.style;
  style.setProperty("--accent", "base");
  style.setProperty("--prism-note-light", "light");
  style.setProperty("--prism-note-base", "base");
  style.setProperty("--prism-note-dark", "dark");
  const values: Record<string, string> = { base: "#123456", light: "#abcdef", dark: "#010203" };
  const convert = vi.fn((color: string) => values[color]);
  expect(readPrismAccentPalette(convert)).toEqual({ accent: "#123456", notes: ["#abcdef", "#123456", "#010203"] });
  expect(convert).toHaveBeenCalledTimes(3);
  expect(() => readPrismAccentPalette(() => "invalid")).toThrow("Invalid resolved color");
});
