import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { initialSeo } from "@/src/cms/seo";
import { SeoProvider, useSeo } from "@/src/cms/SeoProvider";
import { CmsProvider } from "@/src/cms/CmsProvider";
import { ProjectProvider } from "@/src/cms/ProjectProvider";
import { HeroProvider } from "@/src/cms/HeroProvider";
import { AboutProvider } from "@/src/cms/AboutProvider";
import { SocialProvider } from "@/src/cms/SocialProvider";
import { SeoEditor } from "./SeoEditor";
import { HeroEditor } from "./HeroEditor";
import { AboutEditor } from "./AboutEditor";
import { SocialEditor } from "./SocialEditor";
import { ProjectEditor } from "./ProjectEditor";
import { PublicationEditor } from "./PublicationEditor";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
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

it("preserves input and the leave destination through a failed save and retries", async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error("Save failed")).mockResolvedValue(undefined);
  render(<SeoProvider request={request}><SeoEditor id="contact" /><Saved /></SeoProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "SEO title override" }), { target: { value: "Keep edits" } });
  fireEvent.click(screen.getByRole("button", { name: "Back to SEO" }));
  let dialog = await screen.findByRole("dialog", { name: "Keep your changes?" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save and leave" }));
  expect(await within(dialog).findByText("Save failed")).toBeTruthy();
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Stay" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect((screen.getByRole("textbox", { name: "SEO title override" }) as HTMLInputElement).value).toBe("Keep edits");
  fireEvent.click(screen.getByRole("button", { name: "Back to SEO" }));
  dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Save and leave" }));
  await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith("/admin/seo"));
  expect(screen.getByLabelText("Saved Contact title").textContent).toBe("Keep edits");
});

it("keeps invalid save-and-leave open, focuses correction and retries the demo failure", async () => {
  render(<SeoProvider><SeoEditor id="defaults" /><Saved /></SeoProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Default title" }), { target: { value: " " } });
  fireEvent.click(screen.getByRole("button", { name: "Back to SEO" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Save and leave" }));
  expect(await within(dialog).findByRole("alert")).toBeTruthy();
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Stay" }));
  const title = await screen.findByRole("textbox", { name: "Default title" });
  await waitFor(() => expect(document.activeElement).toBe(title));
  fireEvent.change(title, { target: { value: "Corrected default" } });
  fireEvent.click(screen.getByRole("button", { name: "Demo controls" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Fail next request" }));
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByLabelText("Saved default title").textContent).toBe("Portfolio");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.getByLabelText("Saved default title").textContent).toBe("Corrected default"));
  expect(screen.queryByRole("alert")).toBeNull();
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
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete in demo" }));
  expect(await within(dialog).findByText("Delete failed")).toBeTruthy();
  expect(screen.getByLabelText("Saved Contact title").textContent).toBe("Contact");
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete in demo" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete in demo" }));
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

it.each(["Hero", "Projects", "Publications", "About", "Social profiles"])("guards navigation from %s to SEO", async (section) => {
  render(<CmsProvider><ProjectProvider><HeroProvider><AboutProvider><SocialProvider>{section === "Hero" ? <HeroEditor /> : section === "Projects" ? <ProjectEditor id="field-notes" /> : section === "Publications" ? <PublicationEditor id="publication-1" /> : section === "About" ? <AboutEditor /> : <SocialEditor />}</SocialProvider></AboutProvider></HeroProvider></ProjectProvider></CmsProvider>);
  const field = section === "Hero" ? "Headline" : section === "Projects" ? "Name" : section === "Publications" ? "Title" : section === "About" ? "Heading" : "GitHub URL";
  fireEvent.change(screen.getByRole("textbox", { name: field }), { target: { value: "Unsaved change" } });
  fireEvent.click(screen.getByRole("button", { name: "SEO" }));
  const dialog = await screen.findByRole("dialog", { name: "Keep your changes?" });
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Discard" }));
  expect(push).toHaveBeenCalledExactlyOnceWith("/admin/seo");
});
