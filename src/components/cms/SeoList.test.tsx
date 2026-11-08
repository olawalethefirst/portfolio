import { CmsShell } from "./CmsShell";
import type { ReactNode } from "react";
import { fireEvent, render as renderPage, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SeoProvider } from "@/src/cms/SeoProvider";
import { initialSeo } from "@/src/cms/seo";
import { SeoList } from "./SeoList";
function render(ui: ReactNode) { return renderPage(ui, { wrapper: CmsShell }); }

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/admin/publications" }));
beforeEach(() => {
  push.mockReset();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
});
afterEach(() => vi.unstubAllGlobals());
it("lists only actual overrides with search and no redundant status filter", () => {
  render(<SeoProvider><SeoList /></SeoProvider>);
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
  expect(screen.queryByRole("button", { name: /Status/ })).toBeNull();
  expect(screen.getByRole("link", { name: /\/contact/ }).getAttribute("href")).toBe("/admin/seo/contact");
  const search = screen.getByRole("searchbox", { name: "Search SEO paths" });
  fireEvent.change(search, { target: { value: " CONTACT " } });
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  fireEvent.change(search, { target: { value: "no-such-override" } });
  expect(screen.getByText("No matching SEO overrides")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
  expect((search as HTMLInputElement).value).toBe("");
  expect(screen.queryByRole("button", { name: /Delete|Move up|Move down|Preview/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Edit defaults" }));
  expect(push).toHaveBeenCalledWith("/admin/seo/defaults");
  fireEvent.click(screen.getByRole("button", { name: "New override" }));
  expect(push).toHaveBeenCalledWith("/admin/seo/new");
});
it("distinguishes an empty override collection from no matches", () => {
  render(<SeoProvider initialState={{ ...initialSeo(), records: [] }}><SeoList /></SeoProvider>);
  expect(screen.getByText("No SEO overrides yet")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
  expect(screen.getByRole("button", { name: "New override" })).toBeTruthy();
});
