import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HeroProvider } from "@/src/cms/HeroProvider";
import type { HeroDraft } from "@/src/cms/hero";
import { HeroEditor } from "./HeroEditor";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
// Keep the real HeroPreview adapter, replacing only the expensive public scene.
vi.mock("@/src/components/prism-fiber/ui/hero/PrismHeroLayout", () => ({
  PrismHeroLayout: ({ content }: { content: HeroDraft }) => <h1>{content.headline}</h1>,
}));

beforeEach(() => {
  push.mockReset();
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(),
  })));
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("scrollY", 360);
});
afterEach(() => vi.unstubAllGlobals());

it("opens only the edited Hero on demand and restores its unsaved values, focus and scroll", async () => {
  render(<HeroProvider><HeroEditor /></HeroProvider>);
  const headline = screen.getByRole("textbox", { name: "Headline" });
  fireEvent.change(headline, { target: { value: "My unsaved hero" } });
  expect(screen.queryByRole("heading", { name: "My unsaved hero" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  expect(await screen.findByRole("heading", { name: "My unsaved hero" })).toBeTruthy();
  expect(screen.queryByRole("navigation", { name: "Content navigation" })).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Exit preview" }));
  fireEvent.keyDown(window, { key: "Escape" });
  expect((screen.getByRole("textbox", { name: "Headline" }) as HTMLInputElement).value).toBe("My unsaved hero");
  expect(screen.getByRole("status", { name: "Hero save status" }).textContent).toContain("Unsaved changes");
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Preview" }));
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 360, behavior: "instant" });
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  await screen.findByRole("heading", { name: "My unsaved hero" });
  fireEvent.click(screen.getByRole("button", { name: "Exit preview" }));
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Preview" }));
});

it("discards Hero edits to the last saved values and disables discard during saving", async () => {
  render(<HeroProvider><HeroEditor /></HeroProvider>);
  const headline = screen.getByRole("textbox", { name: "Headline" }) as HTMLInputElement;
  const discard = screen.getByRole("button", { name: "Discard changes" });
  expect(discard.hasAttribute("disabled")).toBe(true);
  fireEvent.change(headline, { target: { value: "Saved hero headline" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(discard.hasAttribute("disabled")).toBe(true);
  await waitFor(() => expect(screen.getByRole("status", { name: "Hero save status" }).textContent).toBe("No unsaved changes"));
  fireEvent.change(headline, { target: { value: "Unsaved replacement" } });
  fireEvent.click(discard);
  expect(headline.value).toBe("Saved hero headline");
  expect(discard.hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("status", { name: "Hero save status" }).textContent).toBe("No unsaved changes");
});

it("retains the demo failure setting through collapse and preserves edits for save retry", async () => {
  render(<HeroProvider><HeroEditor /></HeroProvider>);
  expect(screen.queryByRole("checkbox", { name: "Fail next save" })).toBeNull();
  const demo = screen.getByRole("button", { name: "Demo controls" });
  fireEvent.click(demo);
  fireEvent.click(screen.getByRole("checkbox", { name: "Fail next save" }));
  fireEvent.click(demo);
  expect(demo.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(demo);
  expect(screen.getByRole("checkbox", { name: "Fail next save", checked: true })).toBeTruthy();
  const headline = screen.getByRole("textbox", { name: "Headline" }) as HTMLInputElement;
  fireEvent.change(headline, { target: { value: "Keep through failed save" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(headline.value).toBe("Keep through failed save");
  expect(screen.getByRole("status", { name: "Hero save status" }).textContent).toContain("Unsaved changes");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.getByRole("status", { name: "Hero save status" }).textContent).toBe("No unsaved changes"));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(headline.value).toBe("Keep through failed save");
});

it("saves before leaving Hero and retains edits and destination through a failed save", async () => {
  render(<HeroProvider><HeroEditor /></HeroProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Headline" }), { target: { value: "Keep before leaving" } });
  fireEvent.click(screen.getByRole("button", { name: "Demo controls" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Fail next save" }));
  fireEvent.click(screen.getByRole("button", { name: "Projects" }));
  const dialog = await screen.findByRole("dialog", { name: "Keep your changes?" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save and leave" }));
  expect(within(dialog).getByRole("button", { name: "Stay" }).hasAttribute("disabled")).toBe(true);
  expect(within(dialog).getByRole("button", { name: "Discard" }).hasAttribute("disabled")).toBe(true);
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  expect(screen.getByRole("dialog")).toBe(dialog);
  expect(await within(dialog).findByRole("alert")).toBeTruthy();
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Stay" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect((screen.getByRole("textbox", { name: "Headline" }) as HTMLInputElement).value).toBe("Keep before leaving");
  fireEvent.click(screen.getByRole("button", { name: "Projects" }));
  fireEvent.click(await screen.findByRole("button", { name: "Save and leave" }));
  await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith("/admin/projects"));
});
