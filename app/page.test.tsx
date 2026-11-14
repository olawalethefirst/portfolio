import { beforeEach, expect, it, vi } from "vitest";
import { initialHero } from "@/src/cms/hero";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/src/db/hero", () => ({ readHero: vi.fn() }));
vi.mock("./PrismHeroLayoutLab", () => ({ PrismHeroLayoutLab: () => null }));

import { readHero } from "@/src/db/hero";
import Home from "./page";

beforeEach(() => { vi.mocked(readHero).mockReset(); });

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
