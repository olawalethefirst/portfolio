import { render, screen } from "@testing-library/react";
import AdminLoginPage from "./login/page";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminLayout from "./layout";

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
afterEach(() => vi.unstubAllEnvs());

describe("CMS prototype access", () => {
  it("does not expose the demo in production without explicit opt-in", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CMS_DEMO_ENABLED", "");
    expect(() => AdminLayout({ children: "CMS" })).toThrow("NOT_FOUND");
  });
  it("allows local development and an explicitly enabled production demo", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(() => AdminLayout({ children: "CMS" })).not.toThrow();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CMS_DEMO_ENABLED", "true");
    expect(() => AdminLayout({ children: "CMS" })).not.toThrow();
  });
});


it("renders the login without editor navigation or draft storage access", async () => {
  vi.stubEnv("NODE_ENV", "development");
  const readStorage = vi.spyOn(Storage.prototype, "length", "get");
  try {
    render(AdminLayout({ children: await AdminLoginPage({ searchParams: Promise.resolve({}) }) }));
    expect(screen.getByRole("heading", { name: "Content Studio" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Content navigation" })).toBeNull();
    expect(readStorage).not.toHaveBeenCalled();
  } finally {
    readStorage.mockRestore();
  }
});
