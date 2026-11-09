import { CmsShell } from "./CmsShell";
import type { ReactNode } from "react";
import { HeroProvider } from "@/src/cms/HeroProvider";
import { act, fireEvent, render as renderPage, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HeroEditor } from "./HeroEditor";

function render(ui: ReactNode) { return renderPage(ui, { wrapper: CmsShell }); }

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/admin/publications" }));
// Keep the real public layout and CTA links; replace only the WebGL scene.
vi.mock("@/src/components/prism-fiber/Prism", () => ({ Prism: () => null }));

// Exercise the real preview without depending on dynamic-import scheduling.
vi.mock("next/dynamic", async () => {
  const { HeroPreview } = await import("./HeroPreview");
  return { default: () => HeroPreview };
});

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
  fireEvent.change(headline, { target: { value: "Keep failed save" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(headline.value).toBe("Keep failed save");
  expect(screen.getByRole("status", { name: "Hero save status" }).textContent).toContain("Unsaved changes");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.getByRole("status", { name: "Hero save status" }).textContent).toBe("No unsaved changes"));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(headline.value).toBe("Keep failed save");
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

it("shows nested length errors on blur, corrects them live and retains over-limit drafts in preview", async () => {
  const request = vi.fn();
  render(<HeroProvider request={request}><HeroEditor /></HeroProvider>);
  const idea = () => within(screen.getByRole("region", { name: "Idea" }));
  const tagline = idea().getByRole("textbox", { name: "Tagline" });
  fireEvent.change(tagline, { target: { value: "x".repeat(27) } });
  expect(tagline.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.focus(tagline);
  fireEvent.blur(tagline);
  expect(tagline.getAttribute("aria-invalid")).toBe("true");
  expect(idea().getByText("Use 26 characters or fewer.")).toBeTruthy();
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  fireEvent.click(await screen.findByRole("button", { name: "Exit preview" }));
  expect((idea().getByRole("textbox", { name: "Tagline" }) as HTMLInputElement).value).toBe("x".repeat(27));
  fireEvent.change(idea().getByRole("textbox", { name: "Tagline" }), { target: { value: "Corrected" } });
  expect(idea().getByRole("textbox", { name: "Tagline" }).getAttribute("aria-invalid")).not.toBe("true");
});

it("submits the owning form and suppresses request failures after newer edits", async () => {
  let fail!: (reason: Error) => void;
  const request = vi.fn(() => new Promise<void>((_, reject) => { fail = reject; }));
  render(<HeroProvider request={request}><HeroEditor /></HeroProvider>);
  const headline = screen.getByRole("textbox", { name: "Headline" });
  fireEvent.change(headline, { target: { value: "Submitted" } });
  expect(headline.closest("form")).toBeTruthy();
  fireEvent.submit(headline.closest("form")!);
  expect(request).toHaveBeenCalledTimes(1);
  fireEvent.change(headline, { target: { value: "Newer edit" } });
  await act(async () => fail(new Error("Old failure")));
  expect(screen.queryByRole("alert")).toBeNull();
});

it("keeps newer nested edits after a pending save and discards to the submitted snapshot", async () => {
  let finish!: () => void;
  const request = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  render(<HeroProvider request={request}><HeroEditor /></HeroProvider>);
  const description = within(screen.getByRole("region", { name: "Idea" })).getByRole("textbox", { name: "Description" }) as HTMLTextAreaElement;
  fireEvent.change(description, { target: { value: "Submitted idea" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  fireEvent.change(description, { target: { value: "Newer idea" } });
  await act(async () => finish());
  expect(description.value).toBe("Newer idea");
  expect(screen.getByRole("status", { name: "Hero save status" }).textContent).toBe("Unsaved changes");
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(description.value).toBe("Submitted idea");
});

it("focuses the earliest invalid nested field and resets feedback on discard", async () => {
  const request = vi.fn();
  render(<HeroProvider request={request}><HeroEditor /></HeroProvider>);
  const idea = within(screen.getByRole("region", { name: "Idea" })).getByRole("textbox", { name: "Description" });
  const iterate = within(screen.getByRole("region", { name: "Iterate" })).getByRole("textbox", { name: "Tagline" });
  fireEvent.change(iterate, { target: { value: "" } });
  fireEvent.change(idea, { target: { value: "x".repeat(57) } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(document.activeElement).toBe(idea));
  const ids = idea.getAttribute("aria-describedby")?.split(" ") ?? [];
  expect(ids.some((id) => document.getElementById(id)?.textContent === "Use 56 characters or fewer.")).toBe(true);
  expect(request).not.toHaveBeenCalled();
  fireEvent.change(idea, { target: { value: "Corrected" } });
  expect(idea.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(iterate.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.change(iterate, { target: { value: "" } });
  expect(iterate.getAttribute("aria-invalid")).not.toBe("true");
});
