import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SeoProvider } from "@/src/cms/SeoProvider";
import { initialSeo } from "@/src/cms/seo";
import { SeoList } from "./SeoList";
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
beforeEach(() => {
  push.mockReset();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
});
afterEach(() => vi.unstubAllGlobals());
async function status(label: string) {
  fireEvent.click(screen.getByRole("button", { name: /Status/ }));
  fireEvent.click(await screen.findByRole("option", { name: label }));
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
}
it("searches saved paths/overrides with status and clears both filters without mutating records", async () => {
  render(<SeoProvider><SeoList /></SeoProvider>);
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
  expect(screen.getByRole("link", { name: /\/contact/ }).getAttribute("href")).toBe("/admin/seo/contact");
  await status("Inherited");
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search SEO paths" }), { target: { value: " CONTACT " } });
  expect(screen.getByText("No matching SEO overrides")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
  expect((screen.getByRole("searchbox", { name: "Search SEO paths" }) as HTMLInputElement).value).toBe("");
  await status("Custom");
  fireEvent.change(screen.getByRole("searchbox", { name: "Search SEO paths" }), { target: { value: " CONTACT " } });
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  expect(screen.queryByRole("button", { name: /Delete|Move up|Move down|Preview/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Edit defaults" }));
  expect(push).toHaveBeenCalledWith("/admin/seo/defaults");
  fireEvent.click(screen.getByRole("button", { name: "New override" }));
  expect(push).toHaveBeenCalledWith("/admin/seo/new");
});
it("distinguishes an empty override collection from no matches", () => {
  render(<SeoProvider initialState={{ ...initialSeo(), records: [] }}><SeoList /></SeoProvider>);
  expect(screen.getByText("No SEO overrides yet")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
  expect(screen.getByRole("button", { name: "New override" })).toBeTruthy();
});
