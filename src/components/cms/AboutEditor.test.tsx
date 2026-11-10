import { CmsShell } from "./CmsShell";
import type { ReactNode } from "react";
import { AboutProvider, useAbout } from "@/src/cms/AboutProvider";
import { act, fireEvent, render as renderPage, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AboutEditor } from "./AboutEditor";

function render(ui: ReactNode) { return renderPage(ui, { wrapper: CmsShell }); }

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/admin/publications" }));

beforeEach(() => {
  push.mockReset();
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("scrollY", 240);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
});
afterEach(() => vi.unstubAllGlobals());

function Saved() {
  const { saved } = useAbout();
  return <output aria-label="Saved biography">{saved.biography}</output>;
}

it("previews unsaved About content with the fixed CTA without saving or losing edits", async () => {
  render(<AboutProvider><AboutEditor /><Saved /></AboutProvider>);
  const saved = screen.getByLabelText("Saved biography").textContent;
  fireEvent.change(screen.getByRole("textbox", { name: "Heading" }), { target: { value: "Meet the maker" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Biography" }), { target: { value: "Unsaved biography\nSecond paragraph." } });
  expect(screen.queryByRole("link", { name: "Start a conversation" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  expect(await screen.findByRole("region", { name: "Meet the maker" })).toBeTruthy();
  expect(screen.queryByRole("navigation", { name: "Content navigation" })).toBeNull();
  expect(screen.getByLabelText("Saved biography").textContent).toBe(saved);
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Exit preview" }));
  expect(screen.getByRole("link", { name: "Start a conversation" }).getAttribute("href")).toBe("/contact");
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.keyDown(window, { key: "Escape" });
  expect((screen.getByRole("textbox", { name: "Biography" }) as HTMLTextAreaElement).value).toBe("Unsaved biography\nSecond paragraph.");
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Preview" }));
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 240, behavior: "instant" });
});

it("validates without changing saved content and discards errors and working edits", async () => {
  render(<AboutProvider><AboutEditor /><Saved /></AboutProvider>);
  const saved = screen.getByLabelText("Saved biography").textContent;
  const heading = screen.getByRole("textbox", { name: "Heading" });
  fireEvent.change(heading, { target: { value: " " } });
  fireEvent.change(screen.getByRole("textbox", { name: "Biography" }), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(document.activeElement).toBe(heading));
  expect(heading.getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByRole("textbox", { name: "Biography" }).getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByLabelText("Saved biography").textContent).toBe(saved);
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  expect(await within(screen.getByRole("region", { name: "About preview" })).findByRole("status")).toBeTruthy();
  expect(await screen.findByRole("region", { name: "Untitled About section" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Exit preview" }));
  expect((screen.getByRole("textbox", { name: "Biography" }) as HTMLTextAreaElement).value).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect((screen.getByRole("textbox", { name: "Biography" }) as HTMLTextAreaElement).value).toBe(saved);
  expect(screen.getByRole("textbox", { name: "Heading" }).getAttribute("aria-invalid")).not.toBe("true");
});

it("retains edits during a pending save and restores the submitted snapshot after remount", async () => {
  let finish!: () => void;
  const request = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  const { rerender } = render(<AboutProvider request={request}><AboutEditor /><Saved /></AboutProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Biography" }), { target: { value: "Submitted biography" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(screen.getByRole("button", { name: "Discard changes" }).hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(request).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByRole("textbox", { name: "Biography" }), { target: { value: "Still editing" } });
  await act(async () => finish());
  expect(screen.getByLabelText("Saved biography").textContent).toBe("Submitted biography");
  expect(screen.getByRole("status", { name: "About save status" }).textContent).toContain("Unsaved changes");
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect((screen.getByRole("textbox", { name: "Biography" }) as HTMLTextAreaElement).value).toBe("Submitted biography");
  rerender(<AboutProvider request={request}><Saved /></AboutProvider>);
  rerender(<AboutProvider request={request}><AboutEditor /><Saved /></AboutProvider>);
  expect((screen.getByRole("textbox", { name: "Biography" }) as HTMLTextAreaElement).value).toBe("Submitted biography");
});

it("preserves About edits through the demo failure control and retries a toolbar save", async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error("Save failed")).mockResolvedValue(undefined);
  render(<AboutProvider request={request}><AboutEditor /><Saved /></AboutProvider>);
  const saved = screen.getByLabelText("Saved biography").textContent;
  fireEvent.change(screen.getByRole("textbox", { name: "Biography" }), { target: { value: "Retry this biography" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByLabelText("Saved biography").textContent).toBe(saved);
  expect((screen.getByRole("textbox", { name: "Biography" }) as HTMLTextAreaElement).value).toBe("Retry this biography");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.getByLabelText("Saved biography").textContent).toBe("Retry this biography"));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("status", { name: "About save status" }).textContent).toContain("Saved.");
});

it("shows associated errors on blur and corrects them without exposing untouched fields", () => {
  render(<AboutProvider><AboutEditor /></AboutProvider>);
  const heading = screen.getByRole("textbox", { name: "Heading" });
  const biography = screen.getByRole("textbox", { name: "Biography" });
  fireEvent.change(heading, { target: { value: "" } });
  fireEvent.change(biography, { target: { value: "" } });
  expect(heading.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.focus(heading);
  fireEvent.blur(heading);
  expect(heading.getAttribute("aria-invalid")).toBe("true");
  const ids = heading.getAttribute("aria-describedby")?.split(" ") ?? [];
  expect(ids.some((id) => document.getElementById(id)?.textContent === "Complete this field before saving.")).toBe(true);
  expect(biography.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.change(heading, { target: { value: "Corrected" } });
  expect(heading.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.change(heading, { target: { value: " " } });
  expect(heading.getAttribute("aria-invalid")).toBe("true");
});

it("submits the field-owned form and ignores failures after newer corrections", async () => {
  let fail!: (reason: Error) => void;
  const request = vi.fn(() => new Promise<void>((_, reject) => { fail = reject; }));
  render(<AboutProvider request={request}><AboutEditor /></AboutProvider>);
  const heading = screen.getByRole("textbox", { name: "Heading" });
  fireEvent.change(heading, { target: { value: "Submitted heading" } });
  const form = heading.closest("form");
  expect(form).toBeTruthy();
  fireEvent.submit(form!);
  expect(request).toHaveBeenCalledTimes(1);
  fireEvent.change(heading, { target: { value: "Newer heading" } });
  await act(async () => fail(new Error("Old failure")));
  expect(screen.queryByRole("alert")).toBeNull();
});
