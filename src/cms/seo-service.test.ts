import { beforeEach, expect, it, vi } from "vitest";
import { DrizzleQueryError } from "drizzle-orm";

vi.mock("server-only", () => ({}));
vi.mock("@/src/db/seo", () => ({ insertSeo: vi.fn(), readSeo: vi.fn(), updateSeo: vi.fn() }));
import { insertSeo, readSeo, updateSeo } from "@/src/db/seo";
import { createSeo, saveSeo } from "./seo-service";

const defaults = { id: "00000000-0000-4000-8000-000000000001", path: "/", title: "Default", description: "Description" };
const override = { ...defaults, id: "00000000-0000-4000-8000-000000000002", path: "/contact", title: "Contact", description: "" };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(readSeo).mockResolvedValue(override);
  vi.mocked(insertSeo).mockResolvedValue(override);
  vi.mocked(updateSeo).mockResolvedValue(override);
});

it("normalizes new override paths, preserves raw content and returns canonical data", async () => {
  const input = { path: "/%63ontact/", title: "  Contact  ", description: "" };
  expect(await createSeo(input)).toEqual({ ok: true, content: override });
  expect(insertSeo).toHaveBeenCalledExactlyOnceWith({ ...input, path: "/contact" });
});

it.each(["/", "/other/../contact", "/contact?x=1", "/bad%zz"])("rejects invalid/reserved creation path %s without writing", async (path) => {
  expect(await createSeo({ path, title: "Title", description: "" })).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR", issues: expect.arrayContaining([{ pointer: "/path", message: expect.any(String) }]) } });
  expect(insertSeo).not.toHaveBeenCalled();
});

it("requires at least one nonblank override field before creation", async () => {
  expect(await createSeo({ path: "/new", title: " ", description: "" })).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR", issues: [{ pointer: "/title", message: expect.any(String) }] } });
  expect(insertSeo).not.toHaveBeenCalled();
});

it("permits description-only override updates and excludes identity from editable values", async () => {
  expect(await saveSeo(override.id, { path: "/%63ontact/", title: "", description: "  Description only  " })).toEqual({ ok: true, content: override });
  expect(updateSeo).toHaveBeenCalledExactlyOnceWith(override.id, { path: "/contact", title: "", description: "  Description only  " });
});

it("updates default content at / without replacing its identity", async () => {
  vi.mocked(readSeo).mockResolvedValue(defaults);
  vi.mocked(updateSeo).mockResolvedValue(defaults);
  expect(await saveSeo(defaults.id, defaults)).toEqual({ ok: true, content: defaults });
  expect(updateSeo).toHaveBeenCalledExactlyOnceWith(defaults.id, { path: "/", title: defaults.title, description: defaults.description });
});

it.each(["default-path", "override-to-root", "blank-defaults", "blank-override", "invalid-path"])("rejects %s without changing data", async (scenario) => {
  const isDefault = scenario === "default-path" || scenario === "blank-defaults";
  const record = isDefault ? defaults : override;
  vi.mocked(readSeo).mockResolvedValue(record);
  const input = { path: record.path, title: "Title", description: "Description" };
  if (scenario === "default-path") input.path = "/other";
  if (scenario === "override-to-root") input.path = "/";
  if (scenario === "invalid-path") input.path = "/bad?query";
  if (scenario.startsWith("blank")) { input.title = " "; input.description = ""; }
  expect(await saveSeo(record.id, input)).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR", issues: expect.any(Array) } });
  expect(updateSeo).not.toHaveBeenCalled();
});

it("reports both missing default content fields", async () => {
  vi.mocked(readSeo).mockResolvedValue(defaults);
  expect(await saveSeo(defaults.id, { path: "/", title: "", description: " " })).toMatchObject({ ok: false, error: { issues: [
    { pointer: "/title", message: expect.any(String) }, { pointer: "/description", message: expect.any(String) },
  ] } });
});

it.each(["before", "during"])("reports missing update target %s persistence without insertion", async (when) => {
  if (when === "before") vi.mocked(readSeo).mockResolvedValue(null);
  else vi.mocked(updateSeo).mockResolvedValue(null);
  expect(await saveSeo(override.id, override)).toEqual({ ok: false, error: { code: "NOT_FOUND", message: "SEO content was not found." } });
  expect(insertSeo).not.toHaveBeenCalled();
  if (when === "before") expect(updateSeo).not.toHaveBeenCalled();
});

it.each(["create", "update"])("maps concurrent path conflicts during %s to safe path feedback", async (operation) => {
  const driver = Object.assign(new Error("private SQL details"), { code: "23505", constraint_name: "seo_path_key" });
  const failure = new DrizzleQueryError("query", [], driver);
  vi.mocked(insertSeo).mockRejectedValue(failure);
  vi.mocked(updateSeo).mockRejectedValue(failure);
  const result = await (operation === "create" ? createSeo(override) : saveSeo(override.id, override));
  expect(result).toEqual({ ok: false, error: { code: "CONFLICT", message: "An SEO override already exists for this path.", issues: [{ pointer: "/path", message: "An SEO override already exists for this path." }] } });
});

it.each(["create", "read", "update", "unrelated-unique"])("propagates unexpected %s failures unchanged", async (operation) => {
  const failure = operation === "unrelated-unique"
    ? Object.assign(new Error("private"), { code: "23505", constraint_name: "seo_pkey" })
    : new Error("private");
  if (operation === "create" || operation === "unrelated-unique") vi.mocked(insertSeo).mockRejectedValue(failure);
  else if (operation === "read") vi.mocked(readSeo).mockRejectedValue(failure);
  else vi.mocked(updateSeo).mockRejectedValue(failure);
  await expect(operation === "create" || operation === "unrelated-unique" ? createSeo(override) : saveSeo(override.id, override)).rejects.toBe(failure);
});


it("captures update input before the asynchronous current-record read", async () => {
  let finish!: (value: typeof override) => void;
  vi.mocked(readSeo).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const input = { path: "/submitted/", title: "Submitted", description: "" };
  const saving = saveSeo(override.id, input);
  input.path = "/newer";
  input.title = "Newer";
  finish(override);
  await saving;
  expect(updateSeo).toHaveBeenCalledExactlyOnceWith(override.id, { path: "/submitted", title: "Submitted", description: "" });
});
