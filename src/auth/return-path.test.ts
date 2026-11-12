import { expect, it } from "vitest";
import { adminReturnPath } from "./return-path";

it.each([
  "/admin", "/admin/", "/admin/projects", "/admin/publications/abc",
  "/admin/projects?search=hello%20world&platform=web", "/admin/about#biography",
  "/admin/projects?next=https://example.com", "/admin/projects/caf%C3%A9",
])("preserves a safe originating admin destination: %s", (value) => {
  expect(adminReturnPath(value)).toBe(value);
});

it.each([
  undefined, null, "", "/", "/projects", "/administrator",
  "/api/auth/callback", "/admin/login", "/admin/login/", "/admin/login/reset",
  "/admin/login?next=/admin", "/admin/login#form", "/admin/%6cogin", "/admin/LOGIN",
  "https://example.com/admin", "//example.com/admin", "javascript:alert(1)",
  "/admin/../api/auth/callback", "/admin/projects/../login", "/admin/%2e%2e/admin",
  "/admin/%2E/login", "/admin/%2flogin", "/admin/%5clogin",
  "/admin/%",
  "/admin\\login", "/admin/\nlogin",
  "/admin//login",
])("falls back for missing, unsafe or looping destinations: %s", (value) => {
  expect(adminReturnPath(value)).toBe("/admin");
});

it("uses the URL parser's normalized admin path while preserving the query and fragment", () => {
  expect(adminReturnPath("/admin/projects/../about?preview=true#biography"))
    .toBe("/admin/about?preview=true#biography");
});

// Policy checks the resolved destination; unknown admin routes may produce 404.
it.each([
  ["admin/projects", "/admin/projects"],
  [" /admin/projects", "/admin/projects"],
  ["/admin/projects ", "/admin/projects"],
  ["/admin%2fprojects", "/admin%2fprojects"],
  ["/admin/%256cogin", "/admin/%256cogin"],
  ["/admin/%252e%252e", "/admin/%252e%252e"],
  ["/admin/%00projects", "/admin/%00projects"],
  ["/admin/%20login", "/admin/%20login"],
])("checks the resolved admin destination: %s", (input, expected) => {
  expect(adminReturnPath(input)).toBe(expected);
});
