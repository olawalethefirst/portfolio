import { CmsShell } from "./CmsShell";
import type { ReactNode } from "react";
import { initialSeo } from "@/src/cms/seo";
import { SeoProvider, useSeo } from "@/src/cms/SeoProvider";
import { act, fireEvent, render as renderPage, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SeoEditor } from "./SeoEditor";

function render(ui: ReactNode) { return renderPage(ui, { wrapper: CmsShell }); }

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/admin/publications" }));
beforeEach(() => {
  push.mockReset();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
  vi.stubGlobal("scrollTo", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());
function Saved() {
  const { saved } = useSeo();
  return <><output aria-label="Saved default title">{saved.defaults.title}</output><output aria-label="Saved Contact title">{saved.records.find((record) => record.id === "contact")?.title ?? "Removed"}</output><output aria-label="Path count">{saved.records.length}</output></>;
}

it("saves defaults independently and updates a blank individual field while retaining the explicit override", async () => {
  const initialState = initialSeo();
  initialState.records = initialState.records.map((record) => record.id === "contact" ? { ...record, title: "" } : record);
  const request = vi.fn(async () => {});
  const { rerender } = render(<SeoProvider initialState={initialState} request={request}><SeoEditor id="defaults" /><Saved /></SeoProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Default title" }), { target: { value: "New default" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.getByLabelText("Saved default title").textContent).toBe("New default"));
  expect(screen.getByLabelText("Saved Contact title").textContent).toBe("");
  rerender(<SeoProvider initialState={initialState} request={request}><SeoEditor id="contact" /><Saved /></SeoProvider>);
  const summary = within(screen.getByRole("region", { name: "SEO effective metadata" }));
  expect(summary.getByText("New default")).toBeTruthy();
  expect(summary.getByText("Start a conversation about a project, collaboration, or question.")).toBeTruthy();
  expect((screen.getByRole("textbox", { name: "SEO title override" }) as HTMLInputElement).value).toBe("");
});

it("rejects clearing both fields, preserves saved values and permits saving one inherited field", async () => {
  render(<SeoProvider request={async () => {}}><SeoEditor id="contact" /><Saved /></SeoProvider>);
  const title = screen.getByRole("textbox", { name: "SEO title override" });
  fireEvent.change(title, { target: { value: "" } });
  fireEvent.change(screen.getByRole("textbox", { name: "SEO description override" }), { target: { value: " " } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(document.activeElement).toBe(title));
  expect(title.getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByLabelText("Saved Contact title").textContent).toBe("Contact");
  expect((screen.getByRole("textbox", { name: "Path" }) as HTMLInputElement).value).toBe("/contact");
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect((title as HTMLInputElement).value).toBe("Contact");
  fireEvent.change(title, { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.getByLabelText("Saved Contact title").textContent).toBe(""));
  expect(within(screen.getByRole("region", { name: "SEO effective metadata" })).getByText("Portfolio")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Reset to defaults" })).toBeNull();
});

it("validates new paths, saves normalized paths once and retains edits typed during saving", async () => {
  let finish!: () => void;
  const request = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  render(<SeoProvider request={request}><SeoEditor id="new" /><Saved /></SeoProvider>);
  expect(screen.queryByRole("button", { name: "Delete override" })).toBeNull();
  const path = screen.getByRole("textbox", { name: "Path" });
  fireEvent.change(path, { target: { value: "/contact/" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(document.activeElement).toBe(path));
  expect(screen.getByText(/already exists/)).toBeTruthy();
  expect(request).not.toHaveBeenCalled();
  fireEvent.change(path, { target: { value: "/notes/" } });
  fireEvent.change(screen.getByRole("textbox", { name: "SEO title override" }), { target: { value: "Submitted" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(request).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Discard changes" }).hasAttribute("disabled")).toBe(true);
  fireEvent.change(screen.getByRole("textbox", { name: "SEO title override" }), { target: { value: "Newer edits" } });
  await act(async () => finish());
  expect((path as HTMLInputElement).value).toBe("/notes");
  expect(screen.getByLabelText("Path count").textContent).toBe("3");
  expect(screen.getByRole("status", { name: "SEO save status" }).textContent).toContain("Unsaved changes");
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect((screen.getByRole("textbox", { name: "SEO title override" }) as HTMLInputElement).value).toBe("Submitted");
  expect(screen.getByRole("button", { name: "Delete override" })).toBeTruthy();
});

it("changes a path without creating another record or changing defaults", async () => {
  render(<SeoProvider request={async () => {}}><SeoEditor id="contact" /><Saved /></SeoProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Path" }), { target: { value: "/connect" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.getByRole("status", { name: "SEO save status" }).textContent).toContain("No unsaved changes"));
  expect(screen.getByLabelText("Path count").textContent).toBe("2");
  expect(screen.getByLabelText("Saved Contact title").textContent).toBe("Contact");
  expect(screen.getByLabelText("Saved default title").textContent).toBe("Portfolio");
});

it("confirms deleting a saved override, preserves edits on cancellation/failure, and blocks pending dismissal", async () => {
  let finish!: () => void;
  const request = vi.fn().mockRejectedValueOnce(new Error("Delete failed")).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
  render(<SeoProvider request={request}><SeoEditor id="contact" /><Saved /></SeoProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "SEO title override" }), { target: { value: "Unsaved title" } });
  fireEvent.click(screen.getByRole("button", { name: "Delete override" }));
  let dialog = await screen.findByRole("dialog", { name: "Delete this override?" });
  expect(within(dialog).getByText(/\/contact/)).toBeTruthy();
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect((screen.getByRole("textbox", { name: "SEO title override" }) as HTMLInputElement).value).toBe("Unsaved title");
  fireEvent.click(screen.getByRole("button", { name: "Delete override" }));
  dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
  expect(await within(dialog).findByText("Delete failed")).toBeTruthy();
  expect(screen.getByLabelText("Saved Contact title").textContent).toBe("Contact");
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
  expect(request).toHaveBeenCalledTimes(2);
  expect(within(dialog).getByRole("button", { name: "Cancel" }).hasAttribute("disabled")).toBe(true);
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(screen.getByRole("dialog")).toBe(dialog);
  await act(async () => finish());
  await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith("/admin/seo"));
  expect(screen.getByLabelText("Saved Contact title").textContent).toBe("Removed");
  expect(screen.getByLabelText("Saved default title").textContent).toBe("Portfolio");
});

it("offers recovery for missing IDs and keeps never-saved records free of deletion", () => {
  const { rerender } = render(<SeoProvider><SeoEditor id="missing" /></SeoProvider>);
  expect(screen.getByRole("heading", { name: "SEO override unavailable" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Back to SEO" }));
  expect(push).toHaveBeenCalledWith("/admin/seo");
  rerender(<SeoProvider><SeoEditor id="new" /></SeoProvider>);
  expect(screen.queryByRole("button", { name: "Delete override" })).toBeNull();
});

it("revalidates the override relationship from either field without exposing untouched path errors", () => {
  render(<SeoProvider><SeoEditor id="new" /></SeoProvider>);
  const title = screen.getByRole("textbox", { name: "SEO title override" });
  const description = screen.getByRole("textbox", { name: "SEO description override" });
  const path = screen.getByRole("textbox", { name: "Path" });
  expect(title.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.focus(description);
  fireEvent.blur(description);
  expect(title.getAttribute("aria-invalid")).toBe("true");
  const ids = title.getAttribute("aria-describedby")?.split(" ") ?? [];
  expect(ids.some((id) => document.getElementById(id)?.textContent === "Enter at least one title or description override.")).toBe(true);
  expect(path.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.change(description, { target: { value: "Description only" } });
  expect(title.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.change(description, { target: { value: " " } });
  expect(title.getAttribute("aria-invalid")).toBe("true");
  fireEvent.change(title, { target: { value: "Title only" } });
  expect(title.getAttribute("aria-invalid")).not.toBe("true");
});

it("uses defaults-only form validation and resets independent blur errors on discard", async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  render(<SeoProvider request={request}><SeoEditor id="defaults" /><Saved /></SeoProvider>);
  const title = screen.getByRole("textbox", { name: "Default title" });
  const description = screen.getByRole("textbox", { name: "Default description" });
  fireEvent.change(title, { target: { value: "" } });
  fireEvent.change(description, { target: { value: "" } });
  fireEvent.focus(description);
  fireEvent.blur(description);
  expect(description.getAttribute("aria-invalid")).toBe("true");
  expect(title.getAttribute("aria-invalid")).not.toBe("true");
  const form = title.closest("form");
  expect(form).toBeTruthy();
  expect(form!.noValidate).toBe(true);
  fireEvent.submit(form!);
  await waitFor(() => expect(document.activeElement).toBe(title));
  expect(screen.queryByRole("textbox", { name: "Path" })).toBeNull();
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  fireEvent.change(description, { target: { value: "" } });
  expect(description.getAttribute("aria-invalid")).not.toBe("true");
});

it("clears contextual path errors during correction and retains a newer path after submission", async () => {
  let finish!: () => void;
  const request = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  render(<SeoProvider request={request}><SeoEditor id="new" /></SeoProvider>);
  const path = screen.getByRole("textbox", { name: "Path" }) as HTMLInputElement;
  fireEvent.change(path, { target: { value: "/%63ontact/" } });
  fireEvent.focus(path);
  fireEvent.blur(path);
  expect(path.getAttribute("aria-invalid")).toBe("true");
  fireEvent.change(path, { target: { value: "/notes/" } });
  expect(path.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.change(screen.getByRole("textbox", { name: "SEO title override" }), { target: { value: "Notes" } });
  expect(path.closest("form")).toBeTruthy();
  fireEvent.submit(path.closest("form")!);
  fireEvent.change(path, { target: { value: "/later/" } });
  await act(async () => finish());
  expect(path.value).toBe("/later/");
  expect(screen.getByRole("status", { name: "SEO save status" }).textContent).not.toContain("Saved.");
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(path.value).toBe("/notes");
});

it("suppresses obsolete save errors and retries the current metadata", async () => {
  let fail!: (reason: Error) => void;
  const request = vi.fn().mockImplementationOnce(() => new Promise<void>((_, reject) => { fail = reject; })).mockResolvedValue(undefined);
  render(<SeoProvider request={request}><SeoEditor id="defaults" /><Saved /></SeoProvider>);
  const title = screen.getByRole("textbox", { name: "Default title" });
  fireEvent.change(title, { target: { value: "Submitted" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  fireEvent.change(title, { target: { value: "Newer" } });
  await act(async () => fail(new Error("Obsolete failure")));
  expect(screen.queryByRole("alert")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.getByLabelText("Saved default title").textContent).toBe("Newer"));
});

it("allows discarding validation feedback on an untouched new override", async () => {
  render(<SeoProvider><SeoEditor id="new" /></SeoProvider>);
  const path = screen.getByRole("textbox", { name: "Path" });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(path.getAttribute("aria-invalid")).toBe("true"));
  const discard = screen.getByRole("button", { name: "Discard changes" });
  expect(discard.hasAttribute("disabled")).toBe(false);
  fireEvent.click(discard);
  expect(path.getAttribute("aria-invalid")).not.toBe("true");
  expect(screen.getByRole("textbox", { name: "SEO title override" }).getAttribute("aria-invalid")).not.toBe("true");
});
