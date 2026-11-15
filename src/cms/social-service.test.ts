import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/src/db/social", () => ({ updateSocial: vi.fn() }));

import { updateSocial } from "@/src/db/social";
import { saveSocial } from "./social-service";

const valid = {
  github: "  https://code.example.com/maker  ",
  linkedin: "https://www.linkedin.com/in/maker",
  x: "https://x.com/maker",
};

beforeEach(() => { vi.mocked(updateSocial).mockReset(); });

it("preserves valid submitted text and returns canonical saved destinations", async () => {
  const canonical = { ...valid, github: "https://code.example.com/maker" };
  vi.mocked(updateSocial).mockResolvedValue(canonical);
  expect(await saveSocial(valid)).toEqual({ ok: true, content: canonical });
  expect(updateSocial).toHaveBeenCalledExactlyOnceWith(valid);
});

it.each([
  ["github", ""],
  ["github", "http://github.com/maker"],
  ["linkedin", "https://user:password@linkedin.com/in/maker"],
  ["linkedin", "https://linkedin.com/in/my profile"],
  ["x", "javascript:alert(1)"],
  ["x", "/maker"],
] as const)("rejects invalid %s before persistence: %s", async (field, value) => {
  expect(await saveSocial({ ...valid, [field]: value })).toEqual({
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Check the highlighted fields.",
      issues: [{ pointer: `/${field}`, message: "Enter a complete HTTPS profile URL without sign-in credentials." }],
    },
  });
  expect(updateSocial).not.toHaveBeenCalled();
});

it("reports every invalid destination without partially saving", async () => {
  expect(await saveSocial({ github: "", linkedin: "", x: "" })).toMatchObject({
    ok: false,
    error: { code: "VALIDATION_ERROR", issues: [
      { pointer: "/github" }, { pointer: "/linkedin" }, { pointer: "/x" },
    ] },
  });
  expect(updateSocial).not.toHaveBeenCalled();
});

it("reports an absent singleton without creating sample destinations", async () => {
  vi.mocked(updateSocial).mockResolvedValue(null);
  expect(await saveSocial(valid)).toEqual({
    ok: false,
    error: { code: "NOT_FOUND", message: "Social content was not found." },
  });
});

it("propagates unexpected database failure for safe transport handling", async () => {
  const failure = new Error("Database unavailable");
  vi.mocked(updateSocial).mockRejectedValue(failure);
  await expect(saveSocial(valid)).rejects.toBe(failure);
});
