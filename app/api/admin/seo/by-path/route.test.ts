import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { read, auth } = vi.hoisted(() => ({ read: vi.fn(), auth: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/src/db/seo", () => ({ readSeoByPath: read }));
vi.mock("@/src/auth/server", () => ({ createSupabaseServerClient: auth }));
import { GET } from "./route";
import { proxy } from "@/proxy";

const record = { id: "00000000-0000-4000-8000-000000000002", path: "/contact", title: "", description: "Contact description" };
const request = (path: string) => new NextRequest(`https://portfolio.test/api/admin/seo/by-path?${new URLSearchParams({ path })}`);
beforeEach(() => { vi.resetAllMocks(); read.mockResolvedValue(record); });

it.each(["/contact", "/contact/", "/%63ontact/"])("normalizes %s and returns saved fields without resolving inheritance", async (path) => {
  const response = await GET(request(path));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(record);
  expect(read).toHaveBeenCalledExactlyOnceWith("/contact");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.getSetCookie()).toEqual([]);
  expect(auth).not.toHaveBeenCalled();
});

it("accepts / to fetch the persisted defaults", async () => {
  const defaults = { ...record, path: "/", title: "Default title" };
  read.mockResolvedValue(defaults);
  const response = await GET(request("/"));
  expect(await response.json()).toEqual(defaults);
  expect(read).toHaveBeenCalledExactlyOnceWith("/");
});

it.each(["", "contact", "https://site.test/contact", "//other.test", "/contact?q=x", "/contact#x", "/../secret", "/%2e%2e/secret", "/%2Fsecret", "/bad%", "/[slug]"])("rejects invalid path %s without querying", async (path) => {
  const response = await GET(request(path));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ error: { code: "INVALID_REQUEST" } });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(read).not.toHaveBeenCalled();
});

it.each(["", "?path=/one&path=/two"])("rejects missing or repeated path parameters: %s", async (query) => {
  const response = await GET(new NextRequest(`https://portfolio.test/api/admin/seo/by-path${query}`));
  expect(response.status).toBe(400);
  expect(read).not.toHaveBeenCalled();
});

it("returns 404 for an absent path without manufacturing a default", async () => {
  read.mockResolvedValue(null);
  const response = await GET(request("/missing"));
  expect(response.status).toBe(404);
  expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
  expect(read).toHaveBeenCalledExactlyOnceWith("/missing");
});

it("hides database failures and remains uncached", async () => {
  read.mockRejectedValue(new Error("private database detail"));
  const response = await GET(request("/contact"));
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: { code: "INTERNAL_ERROR", message: "Unable to complete this request. Try again later." } });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.getSetCookie()).toEqual([]);
});

it.each(["GET", "HEAD"])("bypasses auth/session setup for public %s path lookup", async (method) => {
  auth.mockImplementation(() => { throw new Error("Missing auth config"); });
  const response = await proxy(new NextRequest(request("/contact").url, { method }));
  expect(response.headers.get("x-middleware-next")).toBe("1");
  expect(response.headers.getSetCookie()).toEqual([]);
  expect(auth).not.toHaveBeenCalled();
  expect((await GET(request("/contact"))).status).toBe(200);
});
