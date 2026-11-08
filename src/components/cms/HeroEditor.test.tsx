import { HeroProvider } from "@/src/cms/HeroProvider";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HeroEditor } from "./HeroEditor";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
// Keep the real public layout and CTA links; replace only the WebGL scene.
vi.mock("@/src/components/prism-fiber/Prism", () => ({ Prism: () => null }));

beforeEach(() => {
  push.mockReset();
  vi.stubGlobal("ResizeObserver", class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  });
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

it("preserves edits after a failed save and retries", async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error("Save failed")).mockResolvedValue(undefined);
  render(<HeroProvider request={request}><HeroEditor /></HeroProvider>);
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

it("blocks incomplete Hero saves, focuses the first error and clears errors on discard", async () => {
  render(<HeroProvider><HeroEditor /></HeroProvider>);
  const eyebrow = screen.getByRole("textbox", { name: "Eyebrow" }) as HTMLInputElement;
  const headline = screen.getByRole("textbox", { name: "Headline" }) as HTMLInputElement;
  const savedHeadline = headline.value;
  fireEvent.change(eyebrow, { target: { value: "   " } });
  fireEvent.change(headline, { target: { value: "" } });
  const ideaDescription = within(screen.getByRole("region", { name: "Idea" })).getByRole("textbox", { name: "Description" });
  fireEvent.change(ideaDescription, { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(document.activeElement).toBe(eyebrow));
  expect(eyebrow.getAttribute("aria-invalid")).toBe("true");
  expect(headline.getAttribute("aria-invalid")).toBe("true");
  expect(ideaDescription.getAttribute("aria-invalid")).toBe("true");
  expect(eyebrow.value).toBe("   ");
  expect(screen.getByRole("status", { name: "Hero save status" }).textContent).toContain("Unsaved changes");
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(headline.value).toBe(savedHeadline);
  expect(eyebrow.getAttribute("aria-invalid")).not.toBe("true");
  expect(screen.queryByRole("alert")).toBeNull();
});

it.each([["Work", "/#work"], ["Hire", "/contact"]])("uses the public %s destination without losing Hero edits", async (label, path) => {
  render(<HeroProvider><HeroEditor /></HeroProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Headline" }), { target: { value: "Keep while opening links" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  const link = await screen.findByRole("link", { name: label });
  expect(link.getAttribute("href")).toBe(path);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Exit preview" }));
  expect((screen.getByRole("textbox", { name: "Headline" }) as HTMLInputElement).value).toBe("Keep while opening links");
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Preview" }));
});
