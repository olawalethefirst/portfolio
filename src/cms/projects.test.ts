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
