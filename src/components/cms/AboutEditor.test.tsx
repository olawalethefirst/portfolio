import { CmsShell } from "./CmsShell";
import type { ReactNode } from "react";
import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";
import { useAboutQuery } from "@/src/cms/about-queries";
import { mockAboutApi } from "@/src/cms/test-support/mockAboutApi";
import { act, fireEvent, render as renderPage, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AboutEditor } from "./AboutEditor";

async function render(ui: ReactNode) {
  const page = renderPage(<CmsQueryProvider accountId="test-owner">{ui}</CmsQueryProvider>, { wrapper: CmsShell });
  await screen.findByRole("textbox", { name: "Heading" });
  return page;
}

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/admin/publications" }));

beforeEach(() => {
  mockAboutApi();
  push.mockReset();
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("scrollY", 240);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function Saved() {
  const { data: saved } = useAboutQuery();
  return <output aria-label="Saved biography">{saved?.biography}</output>;
}

it("previews unsaved About content with the fixed CTA without saving or losing edits", async () => {
  await render(<><AboutEditor /><Saved /></>);
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
  await render(<><AboutEditor /><Saved /></>);
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

it("locks fields and actions while saving the captured input", async () => {
  let finish!: () => void;
  const request = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  mockAboutApi(request);
  await render(<><AboutEditor /><Saved /></>);
  const biography = screen.getByRole("textbox", { name: "Biography" }) as HTMLTextAreaElement;
  fireEvent.change(biography, { target: { value: "Submitted biography" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  expect(biography.matches(":disabled")).toBe(true);
  for (const name of ["Save changes", "Discard changes", "Preview", "Use saved Biography"])
    expect(screen.getByRole("button", { name }).hasAttribute("disabled")).toBe(true);
  fireEvent.change(biography, { target: { value: "Blocked edit" } });
  expect(biography.value).toBe("Submitted biography");
  await act(async () => finish());
  await waitFor(() => expect(screen.getByLabelText("Saved biography").textContent).toBe("Submitted biography"));
  expect(biography.matches(":disabled")).toBe(false);
  expect(screen.getByRole("status", { name: "About save status" }).textContent).toBe("No unsaved changes");
});

it("preserves About edits after failure and retries a toolbar save", async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error("Save failed")).mockResolvedValue(undefined);
  mockAboutApi(request);
  await render(<><AboutEditor /><Saved /></>);
  const saved = screen.getByLabelText("Saved biography").textContent;
  fireEvent.change(screen.getByRole("textbox", { name: "Biography" }), { target: { value: "Retry this biography" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByLabelText("Saved biography").textContent).toBe(saved);
  expect((screen.getByRole("textbox", { name: "Biography" }) as HTMLTextAreaElement).value).toBe("Retry this biography");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.getByLabelText("Saved biography").textContent).toBe("Retry this biography"));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("status", { name: "About save status" }).textContent).toBe("No unsaved changes");
});

it("shows associated errors on blur and corrects them without exposing untouched fields", async () => {
  await render(<AboutEditor />);
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

it("does not apply a late save failure to an editor that has unmounted", async () => {
  let fail!: (reason: Error) => void;
  const request = vi.fn(() => new Promise<void>((_, reject) => { fail = reject; }));
  mockAboutApi(request);
  const page = await render(<AboutEditor />);
  const heading = screen.getByRole("textbox", { name: "Heading" });
  fireEvent.change(heading, { target: { value: "Submitted heading" } });
  fireEvent.submit(heading.closest("form")!);
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  page.unmount();
  await act(async () => fail(new Error("Old failure")));
  expect(screen.queryByRole("alert")).toBeNull();
});
