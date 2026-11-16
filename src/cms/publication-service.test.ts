import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/src/db/publications", () => ({
  saveAndPublishPublication: vi.fn(),
  createAndPublishPublication: vi.fn(),
}));
import {
  createAndPublishPublication as persistFirstPublish,
  saveAndPublishPublication,
} from "@/src/db/publications";
import {
  createAndPublishPublication,
  publishPublication,
} from "./publication-service";
import { emptyPublication, type PublicationDraft } from "./publications";

const id = "11111111-1111-4111-8111-111111111111";
const today = "2026-01-01";
const draft = emptyPublication();
const complete: PublicationDraft = {
  title: "Launch notes",
  summary: "A useful publication summary",
  bodyMarkdown: "# Launch\n\nBody content.",
  coverSrc: `/media/${id}`,
  coverAlt: "Cover illustration",
  tagsText: "alpha, beta",
  publishedOn: today,
};

beforeEach(() => vi.resetAllMocks());

it("rejects incomplete publish input without persistence and returns field feedback", async () => {
  const result = await publishPublication(id, draft, today);
  expect(result).toMatchObject({
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      issues: expect.arrayContaining([
        { pointer: "/title", message: expect.any(String) },
        { pointer: "/coverSrc", message: expect.any(String) },
      ]),
    },
  });
  expect(saveAndPublishPublication).not.toHaveBeenCalled();
});

it("rejects a scheduled future publication date", async () => {
  const result = await publishPublication(
    id,
    { ...complete, publishedOn: "2026-01-02" },
    today,
  );
  expect(result).toMatchObject({
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      issues: expect.arrayContaining([
        { pointer: "/publishedOn", message: expect.any(String) },
      ]),
    },
  });
  expect(saveAndPublishPublication).not.toHaveBeenCalled();
});

it("persists valid publish input through the atomic database operation", async () => {
  const publishedRecord = { id, draft: complete, published: complete };
  vi.mocked(saveAndPublishPublication).mockResolvedValue(publishedRecord);
  expect(await publishPublication(id, complete, today)).toEqual({
    ok: true,
    content: publishedRecord,
  });
  expect(saveAndPublishPublication).toHaveBeenCalledExactlyOnceWith(
    id,
    complete,
  );
});

it("reports a missing publication when publishing", async () => {
  vi.mocked(saveAndPublishPublication).mockResolvedValue(null);
  expect(await publishPublication(id, complete, today)).toEqual({
    ok: false,
    error: { code: "NOT_FOUND", message: "Publication was not found." },
  });
});

it("rejects incomplete first-publish input without persistence", async () => {
  const result = await createAndPublishPublication(draft, today);
  expect(result).toMatchObject({
    ok: false,
    error: { code: "VALIDATION_ERROR" },
  });
  expect(persistFirstPublish).not.toHaveBeenCalled();
});

it("creates and publishes valid first-publish input through the atomic database operation", async () => {
  const publishedRecord = { id, draft: complete, published: complete };
  vi.mocked(persistFirstPublish).mockResolvedValue(publishedRecord);
  expect(await createAndPublishPublication(complete, today)).toEqual({
    ok: true,
    content: publishedRecord,
  });
  expect(persistFirstPublish).toHaveBeenCalledExactlyOnceWith(complete);
});

it("defaults to the real current date when none is supplied", async () => {
  const tomorrow = new Date(Date.now() + 86_400_000)
    .toISOString()
    .slice(0, 10);
  const result = await publishPublication(id, {
    ...complete,
    publishedOn: tomorrow,
  });
  expect(result).toMatchObject({
    ok: false,
    error: { code: "VALIDATION_ERROR" },
  });
  expect(saveAndPublishPublication).not.toHaveBeenCalled();
});
