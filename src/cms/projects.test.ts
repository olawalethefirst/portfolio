import { expect, it } from "vitest";
import { emptyProject, initialProjects, validateProject } from "./projects";
it("requires content, screenshot description and an HTTPS destination for publishing", () => {
  expect(validateProject(emptyProject()).name).toBeTruthy();
  const draft = initialProjects()[0].draft;
  expect(validateProject(draft)).toEqual({});
  expect(validateProject({ ...draft, liveUrl: "javascript:alert(1)" }).liveUrl).toBeTruthy();
  expect(validateProject({ ...draft, screenshot: "" }).screenshot).toBeTruthy();
  expect(validateProject({ ...draft, screenshotAlt: "" }).screenshotAlt).toBeTruthy();
  expect(validateProject({ ...draft, screenshotAlt: "   " }).screenshotAlt).toBeTruthy();
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

it("allows up to six distinct tags of sixteen characters and rejects more", () => {
  const draft = initialProjects()[0].draft;
  const six = "One, Two, Three, Four, Five, Six";
  expect(validateProject({ ...draft, tagsText: six })).toEqual({});
  expect(validateProject({ ...draft, tagsText: `${six}, one, ` })).toEqual({});
  expect(validateProject({ ...draft, tagsText: "" })).toEqual({});
  expect(validateProject({ ...draft, tagsText: `${six}, Seven` }).tagsText).toBe("Use 6 tags or fewer.");
  expect(validateProject({ ...draft, tagsText: "a".repeat(17) }).tagsText).toBe("Use 16 characters or fewer per tag.");
});
