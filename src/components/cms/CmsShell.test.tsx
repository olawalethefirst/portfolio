import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CmsShell } from "./CmsShell";
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/projects/field-notes" }));
beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
});
afterEach(() => vi.unstubAllGlobals());
it("links directly to each content section for prefetchable navigation", () => {
  render(<CmsShell>Collection</CmsShell>);
  const contact = screen.getByRole("link", { name: "Contact" });
  expect(contact.getAttribute("href")).toBe("/admin/contact");
  let intercepted: boolean | undefined;
  contact.addEventListener("click", (event) => { intercepted = event.defaultPrevented; }, { once: true });
  fireEvent.click(contact);
  expect(intercepted).toBe(false);
});

it("derives the active tab from a nested editor route", () => {
  render(<CmsShell>Project editor</CmsShell>);
  expect(screen.getByRole("link", { name: "Projects" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Publications" }).getAttribute("aria-current")).toBeNull();
});
