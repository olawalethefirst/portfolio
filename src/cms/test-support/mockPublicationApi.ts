import { vi } from "vitest";
import { publicationApi } from "../publication-api";
import { emptyPublication, type PublicationRecord } from "../publications";

export const firstId = "11111111-1111-4111-8111-111111111111";
export const secondId = "22222222-2222-4222-8222-222222222222";

export function publicationRecords(): PublicationRecord[] {
  return [
    {
      id: firstId,
      draft: { ...emptyPublication(), title: "First" },
      published: null,
    },
    {
      id: secondId,
      draft: { ...emptyPublication(), title: "Second" },
      published: null,
    },
  ];
}

/**
 * Install in setup and restore with vi.restoreAllMocks during cleanup.
 * `request` gates the order write, mirroring the real server.
 */
export function mockPublicationApi(
  request: () => Promise<void> = async () => {},
  seed: PublicationRecord[] = publicationRecords(),
) {
  let saved = structuredClone(seed);
  const find = (id: string) => {
    const record = saved.find((item) => item.id === id);
    if (!record) throw new Error(`Unknown Publication ${id}.`);
    return record;
  };
  vi.spyOn(publicationApi, "list").mockImplementation(async () =>
    structuredClone(saved),
  );
  vi.spyOn(publicationApi, "order").mockImplementation(
    async (ids: readonly string[]) => {
      await request();
      saved = ids.map((id) => find(id));
      return structuredClone(saved);
    },
  );
}
