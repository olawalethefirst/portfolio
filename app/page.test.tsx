import { beforeEach, expect, it, vi } from "vitest";
import { initialAbout } from "@/src/cms/about";
import { initialHero } from "@/src/cms/hero";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/src/db/about", () => ({ readAbout: vi.fn() }));
vi.mock("@/src/db/hero", () => ({ readHero: vi.fn() }));
vi.mock("./PrismHeroLayoutLab", () => ({ PrismHeroLayoutLab: () => null }));

import { readAbout } from "@/src/db/about";
import { readHero } from "@/src/db/hero";
import Home from "./page";

beforeEach(() => {
  vi.mocked(readHero).mockReset().mockResolvedValue(initialHero);
  vi.mocked(readAbout).mockReset().mockResolvedValue(initialAbout);
});

it("passes current saved Hero content to the homepage on each server request", async () => {
  const first = { ...initialHero, headline: "Saved introduction" };
  const updated = { ...first, headline: "Updated introduction" };
  vi.mocked(readHero).mockResolvedValueOnce(first).mockResolvedValueOnce(updated);
  expect((await Home()).props.content).toEqual(first);
  expect((await Home()).props.content).toEqual(updated);
});

it("reports missing initialized content instead of displaying samples", async () => {
  vi.mocked(readHero).mockResolvedValue(null);
  await expect(Home()).rejects.toThrow("Hero content was not found.");
});

it("propagates database failure instead of returning sample content", async () => {
  vi.mocked(readHero).mockRejectedValue(new Error("Read failed"));
  await expect(Home()).rejects.toThrow("Read failed");
});

it("passes current saved About content to each server-rendered homepage", async () => {
  const first = { heading: "Saved About", biography: "Saved biography.\nSecond paragraph." };
  const updated = { heading: "Updated About", biography: "Updated biography." };
  vi.mocked(readAbout).mockResolvedValueOnce(first).mockResolvedValueOnce(updated);
  expect((await Home()).props.about).toEqual(first);
  expect((await Home()).props.about).toEqual(updated);
});

it("reports missing About content instead of displaying a sample biography", async () => {
  vi.mocked(readAbout).mockResolvedValue(null);
  await expect(Home()).rejects.toThrow("About content was not found.");
});

it("propagates About database failures instead of displaying a sample biography", async () => {
  vi.mocked(readAbout).mockRejectedValue(new Error("About read failed"));
  await expect(Home()).rejects.toThrow("About read failed");
});
