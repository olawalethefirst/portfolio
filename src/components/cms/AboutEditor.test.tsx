import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AboutProvider, useAbout } from "@/src/cms/AboutProvider";
import { CmsProvider } from "@/src/cms/CmsProvider";
import { HeroProvider } from "@/src/cms/HeroProvider";
import { ProjectProvider } from "@/src/cms/ProjectProvider";
import { AboutEditor } from "./AboutEditor";
import { HeroEditor } from "./HeroEditor";
import { ProjectEditor } from "./ProjectEditor";
import { PublicationEditor } from "./PublicationEditor";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

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

it("previews unsaved About content and confirms the fixed CTA without saving or losing edits", async () => {
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
  expect(fireEvent.click(screen.getByRole("link", { name: "Start a conversation" }))).toBe(false);
  const dialog = await screen.findByRole("dialog", { name: "Open this link?" });
  const open = within(dialog).getByRole("link", { name: "Open link" });
  expect(open.getAttribute("href")).toBe(new URL("/contact", window.location.href).href);
  expect(open.getAttribute("target")).toBe("_blank");
  fireEvent.keyDown(dialog, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByRole("region", { name: "Meet the maker" })).toBeTruthy();
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
  expect(await within(screen.getByRole("main", { name: "About preview" })).findByRole("status")).toBeTruthy();
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

it("keeps invalid or failed save-and-leave in About and retries successfully", async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error("Save failed")).mockResolvedValue(undefined);
  render(<AboutProvider request={request}><AboutEditor /></AboutProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Heading" }), { target: { value: " " } });
  fireEvent.click(screen.getByRole("button", { name: "Projects" }));
  let dialog = await screen.findByRole("dialog", { name: "Keep your changes?" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save and leave" }));
  expect(await within(dialog).findByRole("alert")).toBeTruthy();
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Stay" }));
  const heading = await screen.findByRole("textbox", { name: "Heading" });
  await waitFor(() => expect(document.activeElement).toBe(heading));
  fireEvent.change(heading, { target: { value: "Keep this heading" } });
  fireEvent.click(screen.getByRole("button", { name: "Projects" }));
  dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Save and leave" }));
  expect(await within(dialog).findByText("Save failed")).toBeTruthy();
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Save and leave" }));
  await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith("/admin/projects"));
});

it.each(["Hero", "Projects", "Publications"])("guards navigation from the %s editor to About", async (section) => {
  render(<CmsProvider><ProjectProvider><HeroProvider>{section === "Hero" ? <HeroEditor /> : section === "Projects" ? <ProjectEditor id="field-notes" /> : <PublicationEditor id="publication-1" />}</HeroProvider></ProjectProvider></CmsProvider>);
  const field = section === "Hero" ? "Headline" : section === "Projects" ? "Name" : "Title";
  fireEvent.change(screen.getByRole("textbox", { name: field }), { target: { value: "Unsaved change" } });
  fireEvent.click(screen.getByRole("button", { name: "About" }));
  const dialog = await screen.findByRole("dialog", { name: "Keep your changes?" });
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Discard" }));
  expect(push).toHaveBeenCalledExactlyOnceWith("/admin/about");
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
