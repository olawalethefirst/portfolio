import { expect, it } from "vitest";
import { emptyProject, initialProjects, validateProject } from "./projects";
it("requires content, screenshot description and an HTTPS destination for publishing", () => {
  expect(validateProject(emptyProject()).name).toBeTruthy();
  const draft = initialProjects()[0].draft;
  expect(validateProject(draft)).toEqual({});
  expect(validateProject({ ...draft, liveUrl: "javascript:alert(1)" }).liveUrl).toBeTruthy();
  expect(validateProject({ ...draft, screenshot: "" }).screenshot).toBeTruthy();
  expect(validateProject({ ...draft, screenshotAlt: "" }).screenshotAlt).toBeTruthy();
  expect(validateProject({ ...draft, screenshotAlt: "", decorative: true })).toEqual({});
});

it.each([["name", 11], ["summary", 92], ["what", 228], ["how", 294]] as const)("enforces the %s publish budget while preserving over-limit drafts", async (field, max) => {
  const { projectDraftSchema, projectPublishSchema } = await import("./projects");
  const draft = { ...initialProjects()[0].draft, [field]: "a".repeat(max) };
  expect(projectPublishSchema.safeParse(draft).success).toBe(true);
  draft[field] += "a";
  expect(validateProject(draft)[field]).toBe(`Use ${max} characters or fewer.`);
  expect(projectPublishSchema.safeParse(draft).success).toBe(false);
  expect(projectDraftSchema.parse(draft)).toEqual(draft);
});

it("accepts unfinished draft text and preserves the existing publish URL policy", async () => {
  const { projectDraftSchema } = await import("./projects");
  const draft = { ...emptyProject(), liveUrl: "unfinished" };
  expect(projectDraftSchema.parse(draft)).toEqual(draft);
  expect(validateProject({ ...initialProjects()[0].draft, liveUrl: "https://user:password@example.com" }).liveUrl).toBeUndefined();
});
