import { vi } from "vitest";
import { projectApi } from "../project-api";
import {
  emptyProject,
  type ProjectDraft,
  type ProjectRecord,
} from "../projects";

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

/**
 * Install in setup and restore with vi.restoreAllMocks during cleanup.
 * `request` gates every write (save/create/publish/unpublish/remove/order),
 * mirroring the real server: Save never reports published, publish and
 * first-publish create report both.
 */
export function mockProjectApi(
  request: () => Promise<void> = async () => {},
  seed: ProjectRecord[] = projectRecords(),
) {
  let saved = structuredClone(seed);
  const find = (id: string) => {
    const record = saved.find((item) => item.id === id);
    if (!record) throw new Error(`Unknown Project ${id}.`);
    return record;
  };
  vi.spyOn(projectApi, "list").mockImplementation(async () =>
    structuredClone(saved),
  );
  vi.spyOn(projectApi, "order").mockImplementation(
    async (ids: readonly string[]) => {
      await request();
      saved = ids.map((id) => find(id));
      return structuredClone(saved);
    },
  );
  vi.spyOn(projectApi, "save").mockImplementation(
    async (id: string, draft: ProjectDraft) => {
      await request();
      const content = {
        id,
        draft: structuredClone(draft),
        published: find(id).published,
      };
      saved = saved.map((record) => (record.id === id ? content : record));
      return structuredClone(content);
    },
  );
  vi.spyOn(projectApi, "publish").mockImplementation(
    async (id: string, draft: ProjectDraft) => {
      await request();
      find(id);
      const content = {
        id,
        draft: structuredClone(draft),
        published: structuredClone(draft),
      };
      saved = saved.map((record) => (record.id === id ? content : record));
      return structuredClone(content);
    },
  );
  vi.spyOn(projectApi, "unpublish").mockImplementation(async (id: string) => {
    await request();
    const draft = structuredClone(find(id).draft);
    saved = saved.map((record) =>
      record.id === id ? { ...record, published: null } : record,
    );
    return draft;
  });
  vi.spyOn(projectApi, "remove").mockImplementation(async (id: string) => {
    await request();
    find(id);
    saved = saved.filter((record) => record.id !== id);
  });
  vi.spyOn(projectApi, "create").mockImplementation(
    async (draft: ProjectDraft, intent: "save" | "publish") => {
      await request();
      const content = {
        id: crypto.randomUUID(),
        draft: structuredClone(draft),
        published: intent === "publish" ? structuredClone(draft) : null,
      };
      saved = [...saved, content];
      return structuredClone(content);
    },
  );
}
