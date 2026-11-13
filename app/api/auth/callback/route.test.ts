import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest, type NextResponse } from "next/server";

const { completeSignIn, createClient } = vi.hoisted(() => ({
  completeSignIn: vi.fn(),
  createClient: vi.fn(),
}));
vi.mock("@/src/auth/server", () => ({ createSupabaseServerClient: createClient }));
vi.mock("@/src/auth/callback-service", () => ({ completeGitHubSignIn: completeSignIn }));
import { GET } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
  createClient.mockReturnValue({ auth: {} });
  completeSignIn.mockResolvedValue({ ok: true, userId: "test-user" });
});

function request(query: string) {
  return new NextRequest(`https://portfolio.test/api/auth/callback?${query}`);
}

it("exchanges the code without an Origin header and redirects to the validated destination", async () => {
  const response = await GET(request("code=test-code&returnTo=%2Fadmin%2Fprojects%3Fplatform%3Dweb"));
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("https://portfolio.test/admin/projects?platform=web");
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(completeSignIn).toHaveBeenCalledExactlyOnceWith(expect.anything(), "test-code");
});

it.each(["", "https://evil.test", "/admin/login", "//evil.test"])("uses /admin for absent or unsafe returnTo %j", async (returnTo) => {
  const query = new URLSearchParams({ code: "test-code", returnTo });
  const response = await GET(request(query.toString()));
  expect(response.headers.get("location")).toBe("https://portfolio.test/admin");
});

it.each([
  "", "code=", "code=%20", "code=one&code=two",
  "code=one&returnTo=/admin&returnTo=/admin/about",
  "error=access_denied&error_description=private-details",
  "code=one&error=access_denied",
])("redirects invalid or denied callbacks to login without exchanging: %s", async (query) => {
  const response = await GET(request(query));
  expect(response.status).toBe(303);
  const destination = new URL(response.headers.get("location")!);
  expect(destination.pathname).toBe("/admin/login");
  expect(destination.searchParams.get("error")).toBe("sign_in_failed");
  expect(destination.searchParams.get("returnTo")).toBe("/admin");
  expect(destination.toString()).not.toContain("private-details");
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(createClient).not.toHaveBeenCalled();
  expect(completeSignIn).not.toHaveBeenCalled();
});

it.each([true, false])("preserves actual cookie headers and SDK cache headers on exchange success=%s", async (ok) => {
  let outgoing: NextResponse;
  createClient.mockImplementation((_cookies, response: NextResponse) => {
    outgoing = response;
    return { auth: {} };
  });
  completeSignIn.mockImplementation(async () => {
    outgoing.cookies.set("session.0", "test-session", { path: "/", httpOnly: true, secure: true, sameSite: "lax" });
    outgoing.cookies.set("verifier", "", { path: "/", maxAge: 0 });
    outgoing.headers.set("Pragma", "no-cache");
    outgoing.headers.set("Expires", "0");
    return ok ? { ok: true, userId: "test-user" } : {
      ok: false, error: { code: "UNAUTHENTICATED", message: "Sign-in could not complete. Try again." },
    };
  });
  const response = await GET(request("code=test-code&returnTo=%2Fadmin%2Fprojects"));
  expect(response).toBe(outgoing!);
  expect(response.headers.get("set-cookie")).toContain("session.0=test-session");
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(response.headers.get("set-cookie")).toContain("Secure");
  expect(response.headers.get("set-cookie")).toContain("verifier=; Path=/; Max-Age=0");
  expect(response.headers.get("pragma")).toBe("no-cache");
  expect(response.headers.get("expires")).toBe("0");
  expect(response.headers.get("cache-control")).toContain("no-store");
  const destination = new URL(response.headers.get("location")!);
  expect(destination.pathname).toBe(ok ? "/admin/projects" : "/admin/login");
  if (!ok) expect(destination.searchParams.get("returnTo")).toBe("/admin/projects");
});

it("redirects configuration failures safely without leaking details", async () => {
  createClient.mockImplementation(() => { throw new Error("private configuration"); });
  const response = await GET(request("code=test-code"));
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toContain("error=sign_in_failed");
  expect(response.headers.get("location")).not.toContain("private");
  expect(completeSignIn).not.toHaveBeenCalled();
});
