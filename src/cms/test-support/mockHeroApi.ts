import { vi } from "vitest";
import { heroApi } from "../hero-api";
import { initialHero, type HeroDraft } from "../hero";

/** Install in test setup; restore with vi.restoreAllMocks in test cleanup. */
export function mockHeroApi(request: () => Promise<void> = async () => {}) {
  let saved = structuredClone(initialHero);
  vi.spyOn(heroApi, "read").mockImplementation(async () => structuredClone(saved));
  vi.spyOn(heroApi, "save").mockImplementation(async (value: HeroDraft) => {
    await request();
    saved = structuredClone(value);
    return structuredClone(saved);
  });
}
