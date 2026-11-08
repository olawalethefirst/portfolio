import { afterEach, describe, expect, it, vi } from "vitest";
import AdminLayout from "./layout";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
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
