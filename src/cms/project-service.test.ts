import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/src/db/projects", () => ({
  updateProject: vi.fn(),
  saveAndPublishProject: vi.fn(),
  deletePublishedProject: vi.fn(),
}));
import {
  updateProject,
  saveAndPublishProject,
  deletePublishedProject,
} from "@/src/db/projects";
import { publishProject, unpublishProject } from "./project-service";
import type { ProjectDraft } from "./projects";

const id = "11111111-1111-4111-8111-111111111111";
const draft: ProjectDraft = {
  name: "",
  summary: "",
  what: "",
  how: "",
  platform: "web",
  tagsText: "Tag one, Tag two",
  screenshot: "",
  screenshotAlt: "",
  liveUrl: "",
};
const complete: ProjectDraft = {
  name: "Studio",
  summary: "A useful project summary",
  what: "The problem this project solves",
  how: "The approach used to build this project",
  platform: "web",
  tagsText: "Tag one, Tag two",
  screenshot: `/media/${id}`,
  screenshotAlt: "Project interface",
  liveUrl: "https://example.com",
};

beforeEach(() => vi.resetAllMocks());

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

it("unpublishes only the live snapshot and returns removed content", async () => {
  vi.mocked(deletePublishedProject).mockResolvedValue(complete);
  expect(await unpublishProject(id)).toEqual({ ok: true, content: complete });
  expect(deletePublishedProject).toHaveBeenCalledExactlyOnceWith(id);
  expect(updateProject).not.toHaveBeenCalled();
});

it("reports when there is no published Project to remove", async () => {
  vi.mocked(deletePublishedProject).mockResolvedValue(null);
  expect(await unpublishProject(id)).toEqual({ ok: false, error: {
    code: "NOT_FOUND", message: "Published Project was not found.",
  } });
});
