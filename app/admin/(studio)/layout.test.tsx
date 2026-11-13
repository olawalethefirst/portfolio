import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useHeroQuery } from "@/src/cms/hero-queries";
import { initialHero } from "@/src/cms/hero";
import StudioLayout from "./layout";

vi.mock("@/src/cms/hero-api", async () => {
  const { initialHero } = await import("@/src/cms/hero");
  return { heroApi: { read: async () => initialHero, save: vi.fn() } };
});

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/admin/hero" }));
beforeEach(() => {
  vi.stubEnv("ADMIN_USER_ID", "test-owner");
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function Editor() {
  const { data: saved } = useHeroQuery();
  return saved ? <h1>{saved.headline}</h1> : <p>Loading</p>;
}

it("retains the studio navigation and editor providers for existing admin pages", async () => {
  render(<StudioLayout><Editor /></StudioLayout>);
  expect(screen.getByRole("navigation", { name: "Content navigation" })).toBeTruthy();
  expect(await screen.findByRole("heading", { name: initialHero.headline })).toBeTruthy();
});
