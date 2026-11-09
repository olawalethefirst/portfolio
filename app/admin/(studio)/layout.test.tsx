import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useHero } from "@/src/cms/HeroProvider";
import { initialHero } from "@/src/cms/hero";
import StudioLayout from "./layout";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/admin/hero" }));
beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => vi.unstubAllGlobals());

function Editor() {
  const { saved } = useHero();
  return <h1>{saved.headline}</h1>;
}

it("retains the studio navigation and editor providers for existing admin pages", () => {
  render(<StudioLayout><Editor /></StudioLayout>);
  expect(screen.getByRole("navigation", { name: "Content navigation" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: initialHero.headline })).toBeTruthy();
});
