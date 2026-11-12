import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { signInWithOAuth, createClient } = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  createClient: vi.fn(),
}));
vi.mock("@/src/auth/server", () => ({
  createSupabaseServerClient: createClient,
}));
import { POST } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
  signInWithOAuth.mockResolvedValue({
    data: {
      url: "https://example.supabase.co/auth/v1/authorize?provider=github",
    },
    error: null,
  });
  createClient.mockReturnValue({ auth: { signInWithOAuth } });
});
function request(
  body = "",
  origin: string | null = "https://portfolio.test",
  contentType = "application/x-www-form-urlencoded",
) {
  const headers = new Headers({ "content-type": contentType });
  if (origin !== null) headers.set("origin", origin);
  return new NextRequest("https://portfolio.test/api/auth/github", {
    method: "POST",
    headers,
    body,
  });
}

it("starts GitHub OAuth and returns a 303 with the verifier cookie and cache headers", async () => {
  createClient.mockImplementation((_cookies, response) => {
    response.cookies.set("verifier", "test-verifier", {
      httpOnly: true,
      path: "/",
    });
    response.headers.set("Pragma", "no-cache");
    return { auth: { signInWithOAuth } };
  });
  const response = await POST(
    request("returnTo=%2Fadmin%2Fprojects%3Fplatform%3Dweb"),
  );
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(
    "https://example.supabase.co/auth/v1/authorize?provider=github",
  );
  expect(response.headers.get("set-cookie")).toContain(
    "verifier=test-verifier",
  );
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("pragma")).toBe("no-cache");
  expect(signInWithOAuth).toHaveBeenCalledWith({
    provider: "github",
    options: {
      redirectTo:
        "https://portfolio.test/api/auth/callback?returnTo=%2Fadmin%2Fprojects%3Fplatform%3Dweb",
      skipBrowserRedirect: true,
    },
  });
});

it.each(["", "returnTo=https%3A%2F%2Fevil.test", "returnTo=%2Fadmin%2Flogin"])(
  "uses the admin fallback for absent/unsafe return input: %s",
  async (body) => {
    await POST(request(body));
    const callback = new URL(
      signInWithOAuth.mock.calls[0][0].options.redirectTo,
    );
    expect(callback.searchParams.get("returnTo")).toBe("/admin");
  },
);

it.each([null, "null", "https://evil.test"])(
  "rejects untrusted or missing Origin before OAuth: %s",
  async (origin) => {
    const response = await POST(request("", origin));
    expect(response.status).toBe(403);
    expect(createClient).not.toHaveBeenCalled();
  },
);

it.each([
  [
    "returnTo=/admin&returnTo=/admin/about",
    "application/x-www-form-urlencoded",
  ],
  ["provider=google", "application/x-www-form-urlencoded"],
  ["{}", "application/json"],
])("rejects unsupported input before OAuth: %s", async (body, type) => {
  expect(
    (await POST(request(body, "https://portfolio.test", type))).status,
  ).toBe(400);
  expect(createClient).not.toHaveBeenCalled();
});

it.each(["error", "missing-url", "throws"])(
  "returns a safe error without redirecting on provider failure: %s",
  async (mode) => {
    if (mode === "throws")
      signInWithOAuth.mockRejectedValue(new Error("private provider details"));
    else
      signInWithOAuth.mockResolvedValue({
        data: { url: null },
        error: mode === "error" ? new Error("private provider details") : null,
      });
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(response.headers.get("location")).toBeNull();
    expect(await response.text()).not.toContain("private provider details");
  },
);

it("fails safely when the auth client configuration is unavailable", async () => {
  createClient.mockImplementation(() => {
    throw new Error("configuration details");
  });
  const response = await POST(request());
  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain("configuration details");
});

it("rejects an unreadable form body before constructing the auth client", async () => {
  const input = request();
  vi.spyOn(input, "formData").mockRejectedValue(new Error("invalid body"));
  expect((await POST(input)).status).toBe(400);
  expect(createClient).not.toHaveBeenCalled();
});
