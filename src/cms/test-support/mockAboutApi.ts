import { vi } from "vitest";
import { aboutApi } from "../about-api";
import { initialAbout, type AboutDraft } from "../about";

/** Install in setup and restore with vi.restoreAllMocks during cleanup. */
export function mockAboutApi(request: () => Promise<void> = async () => {}) {
  let saved = structuredClone(initialAbout);
  vi.spyOn(aboutApi, "read").mockImplementation(async () => structuredClone(saved));
  vi.spyOn(aboutApi, "save").mockImplementation(async (value: AboutDraft) => {
    await request();
    saved = structuredClone(value);
    return structuredClone(saved);
  });
}
