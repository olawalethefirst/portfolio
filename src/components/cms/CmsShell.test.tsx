import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CmsShell } from "./CmsShell";
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/admin/projects/field-notes" }));
beforeEach(() => {
  push.mockReset();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
});
afterEach(() => vi.unstubAllGlobals());
it("uses router navigation when a screen does not need a dirty guard", () => {
  render(<CmsShell >Collection</CmsShell>);
  fireEvent.click(screen.getByRole("button", { name: "Contact" }));
  expect(push).toHaveBeenCalledExactlyOnceWith("/admin/contact");
});

it("derives the active tab from a nested editor route", () => {
  render(<CmsShell>Project editor</CmsShell>);
  expect(screen.getByRole("button", { name: "Projects" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("button", { name: "Publications" }).getAttribute("aria-current")).toBeNull();
});
