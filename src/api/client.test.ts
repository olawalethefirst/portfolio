import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiRequestError, requestJson } from "./client";

afterEach(() => vi.unstubAllGlobals());
const schema = z.object({ title: z.string() });

it("validates resources and sends same-origin JSON without caching", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ title: "Saved" }));
  vi.stubGlobal("fetch", fetch);
  expect(await requestJson("/api/example", schema, { method: "PUT", body: { title: "Submitted" } })).toEqual({ title: "Saved" });
  expect(fetch).toHaveBeenCalledWith("/api/example", expect.objectContaining({
    method: "PUT", body: '{"title":"Submitted"}', credentials: "same-origin", cache: "no-store",
  }));
});

it("preserves server status, code, message and every issue", async () => {
  const error = { code: "VALIDATION_ERROR", message: "Check values", issues: [
    { pointer: "/title", message: "Required" }, { pointer: "", message: "Review content" },
  ] };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error }, { status: 422 })));
  await expect(requestJson("/api/example", schema)).rejects.toMatchObject({ kind: "server", status: 422, error });
});

it.each([new Response("<html>private failure</html>", { status: 500 }), Response.json({ title: 1 })])(
  "hides malformed server responses", async (response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    try { await requestJson("/api/example", schema); throw new Error("Expected rejection"); }
    catch (failure) {
      expect(failure).toBeInstanceOf(ApiRequestError);
      expect(failure).toMatchObject({ kind: "response" });
      expect((failure as Error).message).not.toContain("private failure");
    }
  },
);

it("distinguishes a lost response from a server rejection without retrying", async () => {
  const fetch = vi.fn().mockRejectedValue(new TypeError("private network detail"));
  vi.stubGlobal("fetch", fetch);
  await expect(requestJson("/api/example", schema)).rejects.toMatchObject({ kind: "network", status: null });
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("accepts 204 without parsing a JSON body", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
  expect(await requestJson("/api/example", z.undefined(), { method: "DELETE" })).toBeUndefined();
});
