import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuthApiError, type SupabaseClient } from "@supabase/supabase-js";
import type { CookieMethodsServer } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

const { createServerClient, loginRedirect } = vi.hoisted(() => ({
  loginRedirect: vi.fn(),
  createServerClient:
    vi.fn<
      (
        url: string,
        key: string,
        options: { cookies: CookieMethodsServer },
      ) => object
    >(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("./admin-navigation", () => ({ adminLoginRedirect: loginRedirect }));
import { config, proxy } from "../../proxy";

beforeEach(() => {
  vi.resetAllMocks();
  loginRedirect.mockResolvedValue(null);
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
});

it("blocks studio requests before rendering and replaces spoofed return destinations with the actual path", async () => {
  createServerClient.mockReturnValue({
    auth: { getClaims: vi.fn().mockResolvedValue({ data: null, error: null }) },
  });
  loginRedirect.mockResolvedValue(
    "/admin/login?returnTo=%2Fadmin%2Fprojects%3Fplatform%3Dweb",
  );
  const incoming = new NextRequest(
    "https://portfolio.test/admin/projects?platform=web",
    {
      headers: { "x-admin-return-to": "https://evil.test" },
    },
  );
  const response = await proxy(incoming);
  expect(loginRedirect).toHaveBeenCalledExactlyOnceWith(
    expect.anything(),
    "/admin/projects?platform=web",
  );
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(
    "https://portfolio.test/admin/login?returnTo=%2Fadmin%2Fprojects%3Fplatform%3Dweb",
  );
});

it.each(["/admin/login", "/api/admin/hero"])(
  "does not apply page redirects to %s",
  async (path) => {
    createServerClient.mockReturnValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    });
    const response = await proxy(
      new NextRequest(`https://portfolio.test${path}`),
    );
    expect(response.headers.get("location")).toBeNull();
    expect(loginRedirect).not.toHaveBeenCalled();
  },
);
afterEach(() => vi.unstubAllEnvs());

function request(cookie = "session.0=old; session.1=old-chunk; theme=dark") {
  return new NextRequest("https://portfolio.test/admin/projects", {
    headers: { cookie },
  });
}

it("forwards refreshed request cookies to downstream rendering without losing unrelated cookies", async () => {
  createServerClient.mockImplementation((_url, _key, { cookies }) => ({
    auth: {
      getClaims: async () => {
        cookies.setAll!(
          [
            {
              name: "session.0",
              value: "new",
              options: {
                path: "/",
                httpOnly: true,
                secure: true,
                sameSite: "lax",
              },
            },
            { name: "session.1", value: "", options: { path: "/", maxAge: 0 } },
          ],
          {
            "Cache-Control": "private, no-store",
            Pragma: "no-cache",
            Expires: "0",
          },
        );
        return { data: null, error: null };
      },
    },
  }));
  const incoming = request();
  const response = await proxy(incoming);
  const forwarded = response.headers.get("x-middleware-request-cookie");
  expect(forwarded).toContain("session.0=new");
  expect(forwarded).not.toContain("old");
  expect(forwarded).toContain("theme=dark");
  expect(incoming.cookies.get("session.0")?.value).toBe("new");
  expect(response.headers.get("location")).toBeNull();
});

it("continues without creating session cookies or redirecting when no session exists", async () => {
  const getClaims = vi
    .fn<SupabaseClient["auth"]["getClaims"]>()
    .mockResolvedValue({ data: null, error: null });
  createServerClient.mockReturnValue({ auth: { getClaims } });
  const response = await proxy(
    new NextRequest("https://portfolio.test/admin/login", {
      headers: { cookie: "theme=dark" },
    }),
  );
  expect(getClaims).toHaveBeenCalledExactlyOnceWith();
  expect(response.headers.get("set-cookie")).toBeNull();
  expect(response.headers.get("location")).toBeNull();
  expect(response.headers.get("cache-control")).toContain("no-store");
});

it("preserves SDK cookie removal when refresh is rejected", async () => {
  createServerClient.mockImplementation((_url, _key, { cookies }) => ({
    auth: {
      getClaims: async () => {
        cookies.setAll!(
          [{ name: "session.0", value: "", options: { path: "/", maxAge: 0 } }],
          { "Cache-Control": "no-store" },
        );
        return {
          data: null,
          error: new AuthApiError(
            "private provider details",
            400,
            "refresh_token_not_found",
          ),
        };
      },
    },
  }));
  const response = await proxy(request());
  expect(response.headers.get("x-middleware-request-cookie")).not.toContain(
    "session.0=old",
  );
  expect(await response.text()).toBe("");
  expect(response.headers.get("location")).toBeNull();
});

it("does not reuse a client or cookie updates across requests", async () => {
  createServerClient.mockImplementation((_url, _key, { cookies }) => ({
    auth: {
      getClaims: async () => {
        const value = ((await cookies.getAll()) ?? []).find(
          (cookie) => cookie.name === "session",
        )!.value;
        cookies.setAll!(
          [{ name: "session", value: `${value}-new`, options: { path: "/" } }],
          {},
        );
        return { data: null, error: null };
      },
    },
  }));
  const first = await proxy(request("session=first"));
  const second = await proxy(request("session=second"));
  expect(first.headers.get("x-middleware-request-cookie")).toContain("session=first-new");
  expect(second.headers.get("x-middleware-request-cookie")).toContain("session=second-new");
  expect(second.headers.get("x-middleware-request-cookie")).not.toContain("first");
});

it("propagates unexpected refresh failures rather than silently pretending refresh succeeded", async () => {
  const getClaims = vi
    .fn<SupabaseClient["auth"]["getClaims"]>()
    .mockRejectedValue(new Error("refresh unavailable"));
  createServerClient.mockReturnValue({ auth: { getClaims } });
  await expect(proxy(request())).rejects.toThrow("refresh unavailable");
});

it.each([
  ["/admin", true],
  ["/admin/login", true],
  ["/admin/projects", true],
  ["/api/admin/hero", true],
  ["/", false],
  ["/administrator", false],
  ["/api/auth/github", false],
  ["/api/auth/callback", false],
  ["/_next/static/app.js", false],
  ["/brand/google-signin.png", false],
])("limits session refresh scope for %s", (url, expected) => {
  expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(
    expected,
  );
});
