import { vi } from "vitest";
import { socialApi } from "../social-api";
import { initialSocial, type SocialDraft } from "../social";

/** Install in setup and restore with vi.restoreAllMocks during cleanup. */
export function mockSocialApi(request: () => Promise<void> = async () => {}) {
  let saved = structuredClone(initialSocial);
  vi.spyOn(socialApi, "read").mockImplementation(async () => structuredClone(saved));
  vi.spyOn(socialApi, "save").mockImplementation(async (value: SocialDraft) => {
    await request();
    saved = structuredClone(value);
    return structuredClone(saved);
  });
}
