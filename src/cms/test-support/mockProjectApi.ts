import { vi } from "vitest";
import { projectApi } from "../project-api";
import { emptyProject, type ProjectRecord } from "../projects";

export const firstId = "11111111-1111-4111-8111-111111111111";
export const secondId = "22222222-2222-4222-8222-222222222222";

export function projectRecords(): ProjectRecord[] {
  return [
    {
      id: firstId,
      draft: { ...emptyProject(), name: "First" },
      published: null,
    },
    {
      id: secondId,
      draft: { ...emptyProject(), name: "Second" },
      published: null,
    },
  ];
}

/** Install in setup and restore with vi.restoreAllMocks during cleanup. */
export function mockProjectApi(request: () => Promise<void> = async () => {}) {
  let saved = projectRecords();
  vi.spyOn(projectApi, "list").mockImplementation(async () =>
    structuredClone(saved),
  );
  vi.spyOn(projectApi, "order").mockImplementation(
    async (ids: readonly string[]) => {
      await request();
      saved = ids.map((id) => {
        const record = saved.find((item) => item.id === id);
        if (!record) throw new Error(`Unknown Project ${id}.`);
        return record;
      });
      return structuredClone(saved);
    },
  );
}
