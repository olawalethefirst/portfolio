import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MODE_COOKIE, MODE_INIT_SCRIPT, THEME_COOKIE, parseAppearance } from "./appearance";

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

// The head script, run as the browser would, against stubbed cookie and device.
function runModeScript(cookie: string, lightDevice: boolean | "throws") {
  document.documentElement.dataset.mode = "dark";
  vi.spyOn(document, "cookie", "get").mockReturnValue(cookie);
  vi.stubGlobal("matchMedia", () => {
    if (lightDevice === "throws") throw new Error("unsupported");
    return { matches: lightDevice };
  });
  new Function(MODE_INIT_SCRIPT)();
  return document.documentElement.dataset.mode;
}
describe("MODE_INIT_SCRIPT", () => {
  beforeEach(() => {
    document.documentElement.dataset.mode = "dark";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("switches to light for a light device with no saved mode", () => {
    expect(runModeScript("", true)).toBe("light");
    expect(runModeScript("other=1", true)).toBe("light");
  });
  it("leaves the dark default for a dark or unspecified device", () => {
    expect(runModeScript("", false)).toBe("dark");
  });
  it("leaves the server-rendered mode when a valid choice is saved", () => {
    expect(runModeScript("portfolio-mode=dark", true)).toBe("dark");
    expect(runModeScript("a=1; portfolio-mode=light", true)).toBe("dark");
  });
  it("treats an unknown saved value as no choice", () => {
    expect(runModeScript("portfolio-mode=sepia", true)).toBe("light");
  });
  it("does not throw when the device query is unavailable", () => {
    expect(runModeScript("", "throws")).toBe("dark");
  });
});
