import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/src/db/projects", () => ({
  insertProject: vi.fn(),
  updateProject: vi.fn(),
  saveAndPublishProject: vi.fn(),
}));
import {
  insertProject,
  updateProject,
  saveAndPublishProject,
} from "@/src/db/projects";
import { createProject, publishProject, saveProject } from "./project-service";
import type { ProjectDraft, ProjectRecord } from "./projects";

const id = "11111111-1111-4111-8111-111111111111";
const draft: ProjectDraft = {
  name: "",
  summary: "",
  what: "",
  how: "",
  platform: "web",
  screenshot: "",
  screenshotAlt: "",
  liveUrl: "",
};
const record: ProjectRecord = { id, draft, published: null };
const complete: ProjectDraft = {
  name: "Studio",
  summary: "A useful project summary",
  what: "The problem this project solves",
  how: "The approach used to build this project",
  platform: "web",
  screenshot: `/media/${id}`,
  screenshotAlt: "Project interface",
  liveUrl: "https://example.com",
};

beforeEach(() => vi.resetAllMocks());

it("creates an incomplete structurally valid draft and returns its server record", async () => {
  vi.mocked(insertProject).mockResolvedValue(record);
  expect(await createProject(draft)).toEqual({ ok: true, content: record });
  expect(insertProject).toHaveBeenCalledExactlyOnceWith(draft);
});

it("rejects an invalid platform without writing", async () => {
  const invalidDraft = {
    ...draft,
    platform: "desktop",
  } as unknown as ProjectDraft;
  expect(await createProject(invalidDraft)).toMatchObject({
    ok: false,
    error: { code: "VALIDATION_ERROR", issues: [{ pointer: "/platform" }] },
  });
  expect(insertProject).not.toHaveBeenCalled();
});

it("saves an existing incomplete draft", async () => {
  vi.mocked(updateProject).mockResolvedValue(record);
  expect(await saveProject(id, draft)).toEqual({ ok: true, content: record });
  expect(updateProject).toHaveBeenCalledExactlyOnceWith(id, draft);
});

it("returns not found when the saved record is missing", async () => {
  vi.mocked(updateProject).mockResolvedValue(null);
  expect(await saveProject(id, draft)).toEqual({
    ok: false,
    error: { code: "NOT_FOUND", message: "Project was not found." },
  });
});

it.each(["create", "save"])(
  "propagates unexpected %s database failures",
  async (operation) => {
    const failure = new Error("Database unavailable");
    vi.mocked(insertProject).mockRejectedValue(failure);
    vi.mocked(updateProject).mockRejectedValue(failure);
    await expect(
      operation === "create" ? createProject(draft) : saveProject(id, draft),
    ).rejects.toBe(failure);
  },
);

it("rejects incomplete publish input without persistence and returns field feedback", async () => {
  const result = await publishProject(id, draft);
  expect(result).toMatchObject({
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      issues: expect.arrayContaining([
        { pointer: "/name", message: expect.any(String) },
        { pointer: "/screenshot", message: expect.any(String) },
      ]),
    },
  });
  expect(saveAndPublishProject).not.toHaveBeenCalled();
});

it("persists valid publish input through the atomic database operation", async () => {
  const publishedRecord = { id, draft: complete, published: complete };
  vi.mocked(saveAndPublishProject).mockResolvedValue(publishedRecord);
  expect(await publishProject(id, complete)).toEqual({
    ok: true,
    content: publishedRecord,
  });
  expect(saveAndPublishProject).toHaveBeenCalledExactlyOnceWith(id, complete);
});

it("reports a missing project when publishing", async () => {
  vi.mocked(saveAndPublishProject).mockResolvedValue(null);
  expect(await publishProject(id, complete)).toEqual({
    ok: false,
    error: { code: "NOT_FOUND", message: "Project was not found." },
  });
});
