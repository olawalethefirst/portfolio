import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HeroProvider } from "@/src/cms/HeroProvider";
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

it("saves before leaving Hero and retains edits and destination through a failed save", async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error("Save failed")).mockImplementation(() => new Promise<void>((resolve) => setTimeout(resolve, 300)));
  render(<HeroProvider request={request}><HeroEditor /></HeroProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Headline" }), { target: { value: "Keep before leaving" } });
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

it("keeps invalid save-and-leave in the editor and lets Stay focus the field for correction", async () => {
  render(<HeroProvider><HeroEditor /></HeroProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Headline" }), { target: { value: " " } });
  fireEvent.click(screen.getByRole("button", { name: "Projects" }));
  const dialog = await screen.findByRole("dialog", { name: "Keep your changes?" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save and leave" }));
  expect(await within(dialog).findByRole("alert")).toBeTruthy();
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Stay" }));
  const headline = await screen.findByRole("textbox", { name: "Headline" });
  await waitFor(() => expect(document.activeElement).toBe(headline));
  fireEvent.change(headline, { target: { value: "Corrected headline" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.getByRole("status", { name: "Hero save status" }).textContent).toBe("No unsaved changes"));
  expect(headline.getAttribute("aria-invalid")).not.toBe("true");
});

it.each([["Work", "/#work"], ["Hire", "/contact"]])("confirms the public %s destination without losing Hero edits", async (label, path) => {
  render(<HeroProvider><HeroEditor /></HeroProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Headline" }), { target: { value: "Keep while opening links" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  const link = await screen.findByRole("link", { name: label });
  expect(fireEvent.click(link)).toBe(false);
  const dialog = await screen.findByRole("dialog", { name: "Open this link?" });
  const open = within(dialog).getByRole("link", { name: "Open link" });
  expect(open.getAttribute("href")).toBe(new URL(path, window.location.href).href);
  expect(open.getAttribute("target")).toBe("_blank");
  expect(open.getAttribute("rel")).toContain("noopener");
  fireEvent.keyDown(dialog, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByRole("heading", { name: "Keep while opening links" })).toBeTruthy();
  expect(push).not.toHaveBeenCalled();
  expect(fireEvent(link, new MouseEvent("auxclick", { button: 1, bubbles: true, cancelable: true }))).toBe(false);
  const reopened = await screen.findByRole("dialog", { name: "Open this link?" });
  fireEvent.click(within(reopened).getByRole("button", { name: "Stay in preview" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  fireEvent.click(screen.getByRole("button", { name: "Exit preview" }));
  expect((screen.getByRole("textbox", { name: "Headline" }) as HTMLInputElement).value).toBe("Keep while opening links");
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Preview" }));
});
