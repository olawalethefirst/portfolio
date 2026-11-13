import { beforeEach, expect, it, vi } from "vitest";
const { authorize } = vi.hoisted(() => ({ authorize: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./owner-guard", () => ({ authorizeAdmin: authorize }));
import { adminLoginRedirect } from "./admin-navigation";

beforeEach(() => vi.resetAllMocks());
const auth = { getUser: vi.fn() };

it("allows the verified owner to continue", async () => {
  authorize.mockResolvedValue({ ok: true, userId: "owner" });
  expect(await adminLoginRedirect(auth, "/admin/projects")).toBeNull();
  expect(authorize).toHaveBeenCalledExactlyOnceWith(auth);
});

it("returns forbidden users to login with a fixed denial marker and safe destination", async () => {
  authorize.mockResolvedValue({ ok: false, error: { code: "FORBIDDEN", message: "private details" } });
  expect(await adminLoginRedirect(auth, "/admin/projects?platform=web"))
    .toBe("/admin/login?returnTo=%2Fadmin%2Fprojects%3Fplatform%3Dweb&error=access_denied");
});

it("asks unauthenticated visitors to sign in without claiming their login failed", async () => {
  authorize.mockResolvedValue({ ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in." } });
  expect(await adminLoginRedirect(auth, "https://evil.test")).toBe("/admin/login?returnTo=%2Fadmin");
});

it("marks failed verification during callback completion as a sign-in failure", async () => {
  authorize.mockResolvedValue({ ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in." } });
  expect(await adminLoginRedirect(auth, "/admin", "sign_in_failed"))
    .toBe("/admin/login?returnTo=%2Fadmin&error=sign_in_failed");
});
