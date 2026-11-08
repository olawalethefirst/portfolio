import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SocialProvider, useSocial } from "@/src/cms/SocialProvider";
import { AboutProvider } from "@/src/cms/AboutProvider";
import { CmsProvider } from "@/src/cms/CmsProvider";
import { HeroProvider } from "@/src/cms/HeroProvider";
import { ProjectProvider } from "@/src/cms/ProjectProvider";
import { ContactEditor } from "./ContactEditor";
import { AboutEditor } from "./AboutEditor";
import { HeroEditor } from "./HeroEditor";
import { ProjectEditor } from "./ProjectEditor";
import { PublicationEditor } from "./PublicationEditor";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
beforeEach(() => {
  push.mockReset();
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("scrollY", 280);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
});
afterEach(() => { vi.unstubAllGlobals(); Reflect.deleteProperty(HTMLImageElement.prototype, "decode"); });
function Saved() { const { records } = useSocial(); return <output aria-label="Saved GitHub URL">{records.find((record) => record.id === "github")?.url ?? "Removed"}</output>; }
async function chooseImage() {
  fireEvent.change(screen.getByLabelText(/Choose image|Replace image/), { target: { files: [new File(["image"], "custom.png", { type: "image/png" })] } });
  await screen.findByText("custom.png selected for this demo.");
}

it("previews working names, URLs and uploaded images in the full contact form and restores edits", async () => {
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: vi.fn(async () => {}) });
  render(<SocialProvider><ContactEditor id="github" /><Saved /></SocialProvider>);
  const saved = screen.getByLabelText("Saved GitHub URL").textContent;
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "My community" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Profile URL" }), { target: { value: "https://community.example.com/me" } });
  await chooseImage();
  fireEvent.click(screen.getByRole("button", { name: "Preview contact" }));
  expect(await screen.findByRole("heading", { name: "Let’s make something happen." })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "How would you like to connect?" })).toBeTruthy();
  expect(screen.queryByRole("navigation", { name: "Content navigation" })).toBeNull();
  expect(screen.getByLabelText("Saved GitHub URL").textContent).toBe(saved);
  const link = screen.getByRole("link", { name: "Visit My community profile (opens in a new tab)" });
  expect(link.querySelector("img")?.getAttribute("src")).toMatch(/^data:image\/png/);
  expect(fireEvent.click(link, { ctrlKey: true })).toBe(false);
  const dialog = await screen.findByRole("dialog", { name: "Open this link?" });
  expect(within(dialog).getByRole("link", { name: "Open link" }).getAttribute("href")).toBe("https://community.example.com/me");
  fireEvent.keyDown(dialog, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByRole("heading", { name: "How would you like to connect?" })).toBeTruthy();
  expect(fireEvent(link, new MouseEvent("auxclick", { button: 1, bubbles: true, cancelable: true }))).toBe(false);
  fireEvent.click(await screen.findByRole("button", { name: "Stay in preview" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  fireEvent.keyDown(window, { key: "Escape" });
  expect((screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement).value).toBe("My community");
  expect(screen.getByAltText("My community image").getAttribute("src")).toMatch(/^data:image\/png/);
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Preview contact" }));
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 280, behavior: "instant" });
});

it("validates required custom values and captures the submitted image while retaining newer edits", async () => {
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: vi.fn(async () => {}) });
  let finish!: () => void;
  const request = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  render(<SocialProvider request={request}><ContactEditor id="new" /></SocialProvider>);
  expect(screen.queryByRole("button", { name: "Delete profile" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  const name = screen.getByRole("textbox", { name: "Name" });
  await waitFor(() => expect(document.activeElement).toBe(name));
  expect(request).not.toHaveBeenCalled();
  fireEvent.change(name, { target: { value: "Community" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Profile URL" }), { target: { value: "https://example.com/me" } });
  await chooseImage();
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(request).toHaveBeenCalledTimes(1);
  fireEvent.change(name, { target: { value: "Newer name" } });
  await act(async () => finish());
  expect(screen.getByRole("status", { name: "Contact save status" }).textContent).toContain("Unsaved changes");
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect((name as HTMLInputElement).value).toBe("Community");
  expect(screen.getByAltText("Community image").getAttribute("src")).toMatch(/^data:image\/png/);
  expect(screen.getByRole("button", { name: "Delete profile" })).toBeTruthy();
});

it("keeps invalid and failed save-and-leave in the editor and retries without losing the destination", async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error("Save failed")).mockResolvedValue(undefined);
  render(<SocialProvider request={request}><ContactEditor id="github" /><Saved /></SocialProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Profile URL" }), { target: { value: "javascript:alert(1)" } });
  fireEvent.click(screen.getByRole("button", { name: "Back to Contact" }));
  let dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Save and leave" }));
  expect(await within(dialog).findByRole("alert")).toBeTruthy();
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Stay" }));
  const url = await screen.findByRole("textbox", { name: "Profile URL" });
  await waitFor(() => expect(document.activeElement).toBe(url));
  fireEvent.change(url, { target: { value: "https://github.com/revised" } });
  fireEvent.click(screen.getByRole("button", { name: "Back to Contact" }));
  dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Save and leave" }));
  expect(await within(dialog).findByText("Save failed")).toBeTruthy();
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Save and leave" }));
  await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith("/admin/contact"));
  expect(screen.getByLabelText("Saved GitHub URL").textContent).toBe("https://github.com/revised");
});

it("preserves the selected image on failed replacement and saves through a demo failure/retry", async () => {
  const decode = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: decode });
  render(<SocialProvider><ContactEditor id="github" /></SocialProvider>);
  await chooseImage();
  const image = screen.getByAltText("GitHub image").getAttribute("src");
  decode.mockRejectedValueOnce(new Error("Decode failed"));
  fireEvent.change(screen.getByLabelText("Replace image"), { target: { files: [new File(["bad"], "bad.png", { type: "image/png" })] } });
  await screen.findByText(/could not be read/);
  expect(screen.getByAltText("GitHub image").getAttribute("src")).toBe(image);
  fireEvent.click(screen.getByRole("button", { name: "Demo controls" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Fail next request" }));
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await screen.findByText(/demo request failed/);
  expect(screen.getByAltText("GitHub image").getAttribute("src")).toBe(image);
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.getByRole("status", { name: "Contact save status" }).textContent).toContain("No unsaved changes"));
});

it("confirms profile deletion and recovers from cancellation/failure without changing other profiles", async () => {
  let finish!: () => void;
  const request = vi.fn().mockRejectedValueOnce(new Error("Delete failed")).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
  render(<SocialProvider request={request}><ContactEditor id="github" /><Saved /></SocialProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Delete profile" }));
  let dialog = await screen.findByRole("dialog", { name: "Delete this profile?" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  fireEvent.click(screen.getByRole("button", { name: "Delete profile" }));
  dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete in demo" }));
  expect(await within(dialog).findByText("Delete failed")).toBeTruthy();
  expect(screen.getByLabelText("Saved GitHub URL").textContent).not.toBe("Removed");
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete in demo" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete in demo" }));
  expect(request).toHaveBeenCalledTimes(2);
  expect(within(dialog).getByRole("button", { name: "Cancel" }).hasAttribute("disabled")).toBe(true);
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(screen.getByRole("dialog")).toBe(dialog);
  await act(async () => finish());
  await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith("/admin/contact"));
  expect(screen.getByLabelText("Saved GitHub URL").textContent).toBe("Removed");
});

it.each(["Hero", "Projects", "Publications", "About"])("guards navigation from %s to Contact", async (section) => {
  render(<CmsProvider><ProjectProvider><HeroProvider><AboutProvider>{section === "Hero" ? <HeroEditor /> : section === "Projects" ? <ProjectEditor id="field-notes" /> : section === "Publications" ? <PublicationEditor id="publication-1" /> : <AboutEditor />}</AboutProvider></HeroProvider></ProjectProvider></CmsProvider>);
  const field = section === "Hero" ? "Headline" : section === "Projects" ? "Name" : section === "Publications" ? "Title" : "Heading";
  fireEvent.change(screen.getByRole("textbox", { name: field }), { target: { value: "Unsaved change" } });
  fireEvent.click(screen.getByRole("button", { name: "Contact" }));
  const dialog = await screen.findByRole("dialog", { name: "Keep your changes?" });
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Discard" }));
  expect(push).toHaveBeenCalledExactlyOnceWith("/admin/contact");
});
