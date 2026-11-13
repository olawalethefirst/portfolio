import { expect, it, vi } from "vitest";
import { withSameOrigin, withContentType } from "./request";

function request(origin?: string) {
  return new Request("https://portfolio.test/api/example", {
    method: "POST", headers: origin ? { origin } : {},
  });
}

it("runs a matching-origin handler with its request and route context", async () => {
  const context = { params: Promise.resolve({ id: "hero" }) };
  const handler = vi.fn(async (_request: Request, { params }: typeof context) =>
    Response.json(await params, { status: 201 }));
  const incoming = request("https://portfolio.test");
  incoming.headers.set("content-type", "application/json");
  const response = await withSameOrigin(withContentType("application/json", handler))(incoming, context);
  expect(handler).toHaveBeenCalledExactlyOnceWith(incoming, context);
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ id: "hero" });
});

it.each([undefined, "null", "https://evil.test", "http://portfolio.test", "https://portfolio.test:444"])("rejects missing, opaque or mismatched origin: %s", async (origin) => {
  const handler = vi.fn(() => new Response("Allowed"));
  const response = await withSameOrigin(handler)(request(origin));
  expect(response.status).toBe(403);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(await response.json()).toMatchObject({ error: { code: "FORBIDDEN" } });
  expect(handler).not.toHaveBeenCalled();
});

it.each([
  ["application/x-www-form-urlencoded", true],
  ["application/x-www-form-urlencoded; charset=UTF-8", true],
  ["application/json", false], ["text/plain", false],
])("checks content type before invoking the handler: %s", async (contentType, expected) => {
  const input = new Request("https://portfolio.test", { headers: { "content-type": contentType } });
  const handler = vi.fn(() => new Response(null, { status: 204 }));
  const response = await withContentType("application/x-www-form-urlencoded", handler)(input);
  expect(response.status).toBe(expected ? 204 : 400);
  expect(handler).toHaveBeenCalledTimes(expected ? 1 : 0);
  if (!expected) expect(await response.json()).toMatchObject({ error: { code: "INVALID_REQUEST" } });
});

it("rejects an absent content type with the caller's safe error message", async () => {
  const handler = vi.fn(() => new Response(null, { status: 204 }));
  const response = await withContentType("application/json", handler, "Submit JSON.")(request());
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: { code: "INVALID_REQUEST", message: "Submit JSON." } });
  expect(handler).not.toHaveBeenCalled();
});
