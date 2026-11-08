import { expect, it } from "vitest";
import { emptySeoOverride, initialSeo, normalizeSeoPath, resolveSeo, validateSeoDefaults, validateSeoRecord } from "./seo";

it("inherits title and description independently, preserving explicit overrides as defaults change", () => {
  const override = { title: "Custom", description: "  " };
  expect(resolveSeo({ title: "Default", description: "Default description" }, override)).toEqual({ title: "Custom", description: "Default description", titleSource: "Override", descriptionSource: "Default" });
  expect(resolveSeo({ title: "Changed", description: "Changed description" }, override).description).toBe("Changed description");
  expect(resolveSeo({ title: "Changed", description: "Description" }, emptySeoOverride()).title).toBe("Changed");
});
it("requires defaults and permits empty overrides", () => {
  expect(validateSeoDefaults({ title: " ", description: "" })).toEqual({ title: "Enter a default SEO title.", description: "Enter a default SEO description." });
  expect(validateSeoRecord({ id: "new", path: "/new", ...emptySeoOverride() }, initialSeo().records)).toEqual({});
});
it.each(["", "contact", "https://example.com/contact", "//example.com", "/contact?test=1", "/contact#form", "/a/../contact", "/a/%2e%2e/contact", "/bad\\path", "/a/%2f/b", "/a/%5c/b", "/bad path", "/a//b", "/:slug", "/[slug]", "/all/*", "/bad%zz"])("rejects an ambiguous or non-exact site path: %s", (path) => {
  expect(normalizeSeoPath(path)).toBeUndefined();
  expect(validateSeoRecord({ id: "new", path, ...emptySeoOverride() }, []).path).toBeTruthy();
});
it("normalizes trailing slashes and equivalent unreserved encodings, preserves case and rejects duplicate paths", () => {
  expect(normalizeSeoPath("/")).toBe("/");
  expect(normalizeSeoPath("/Contact/")).toBe("/Contact");
  expect(normalizeSeoPath("/%63ontact")).toBe("/contact");
  expect(validateSeoRecord({ id: "new", path: "/contact/", ...emptySeoOverride() }, initialSeo().records).path).toContain("already");
  const contact = initialSeo().records.find((record) => record.path === "/contact")!;
  expect(validateSeoRecord({ ...contact, path: "/contact/" }, initialSeo().records)).toEqual({});
});
