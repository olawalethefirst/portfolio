import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/src/db/about", () => ({ updateAbout: vi.fn() }));

import { updateAbout } from "@/src/db/about";
import { saveAbout } from "./about-service";

beforeEach(() => { vi.mocked(updateAbout).mockReset(); });

it("preserves supplied strings and returns the canonical saved resource", async () => {
  const submitted = { heading: "  About me  ", biography: "Biography\nwith formatting.  " };
  const canonical = { ...submitted, heading: "Canonical heading" };
  vi.mocked(updateAbout).mockResolvedValue(canonical);
  expect(await saveAbout(submitted)).toEqual({ ok: true, content: canonical });
  expect(updateAbout).toHaveBeenCalledExactlyOnceWith(submitted);
});

it.each([
  ["heading", ""],
  ["heading", " \t\n"],
  ["biography", ""],
  ["biography", " \t\n"],
] as const)("rejects a blank %s before writing: %j", async (field, value) => {
  expect(await saveAbout({ heading: "About me", biography: "Biography", [field]: value })).toEqual({
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Check the highlighted fields.",
      issues: [{ pointer: `/${field}`, message: "Complete this field before saving." }],
    },
  });
  expect(updateAbout).not.toHaveBeenCalled();
});

it("reports both incomplete fields without partially updating content", async () => {
  const result = await saveAbout({ heading: "", biography: "" });
  expect(result).toMatchObject({
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      issues: [
        { pointer: "/heading", message: "Complete this field before saving." },
        { pointer: "/biography", message: "Complete this field before saving." },
      ],
    },
  });
  expect(updateAbout).not.toHaveBeenCalled();
});

it("returns NOT_FOUND when the required singleton is absent", async () => {
  vi.mocked(updateAbout).mockResolvedValue(null);
  expect(await saveAbout({ heading: "About me", biography: "Biography" })).toEqual({
    ok: false,
    error: { code: "NOT_FOUND", message: "About content was not found." },
  });
});

it("propagates unexpected database failures to the HTTP boundary", async () => {
  const failure = new Error("Connection failed");
  vi.mocked(updateAbout).mockRejectedValue(failure);
  await expect(saveAbout({ heading: "About me", biography: "Biography" })).rejects.toBe(failure);
});
