import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CmsShell } from "./CmsShell";
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
beforeEach(() => {
  push.mockReset();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
});
afterEach(() => vi.unstubAllGlobals());
it("uses router navigation when a screen does not need a dirty guard", () => {
  render(<CmsShell section="projects">Collection</CmsShell>);
  fireEvent.click(screen.getByRole("button", { name: "Contact" }));
  expect(push).toHaveBeenCalledExactlyOnceWith("/admin/contact");
});
