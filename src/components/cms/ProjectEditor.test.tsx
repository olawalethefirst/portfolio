import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";
import { CmsShell } from "./CmsShell";
import type { ReactNode } from "react";
import { labProjects } from "@/src/components/project-item/lab-projects";
import { ProjectProvider, useProjects } from "@/src/cms/ProjectProvider";
import { ApiRequestError } from "@/src/api/client";
import { projectApi } from "@/src/cms/project-api";
import { initialProjects } from "@/src/cms/projects";
import { mockProjectApi } from "@/src/cms/test-support/mockProjectApi";
import { act, fireEvent, render as renderPage, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProjectEditor } from "./ProjectEditor";

/** id="new" never queries the collection, so this also covers that case. */
async function render(ui: ReactNode) {
  const result = renderPage(<CmsQueryProvider accountId="owner">{ui}</CmsQueryProvider>, { wrapper: CmsShell });
  await waitFor(() => expect(screen.queryByRole("status", { name: "Loading project" })).toBeNull());
  return result;
}

const { push, uploadImage } = vi.hoisted(() => ({ push: vi.fn(), uploadImage: vi.fn() }));
vi.mock("@/src/media/upload-client", () => ({ uploadImage }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/admin/publications" }));

vi.mock("@/src/components/project-item/ProjectDeviceStage", () => ({
  ProjectDeviceStage: ({ platform }: { platform: string }) => <p>{platform} device preview</p>,
}));

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  });
  push.mockReset();
  uploadImage.mockReset().mockResolvedValue(uploadedScreenshot);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  Object.defineProperty(Element.prototype, "getAnimations", {
    configurable: true,
    value: () => [],
  });
  mockProjectApi(async () => {}, initialProjects());
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(Element.prototype, "getAnimations");
});


function Published() { const { records } = useProjects(); return <output aria-label="Published name">{records[0]?.published?.name ?? "Unpublished"}</output>; }

it("locks fields during save, then permits edits without changing published content", async () => {
  let finish!: () => void;
  const request = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  await render(<ProjectProvider request={request}><ProjectEditor id="field-notes" /><Published /></ProjectProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Submitted" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect([...screen.getByRole("textbox", { name: "Name" }).closest("form")!.querySelectorAll("input, textarea, button")].every((control) => control.matches(":disabled"))).toBe(true);
  expect(screen.getByRole("button", { name: "Preview project" }).matches(":disabled")).toBe(true);
  await act(async () => finish());
  expect(screen.getByRole("textbox", { name: "Name" }).matches(":disabled")).toBe(false);
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Still editing" } });
  expect(screen.getByRole("status", { name: "Project save status" }).textContent).toContain("Unsaved changes");
  expect(screen.getByLabelText("Published name").textContent).toBe("Field Notes");
  fireEvent.click(screen.getByRole("button", { name: "Publications" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(push).toHaveBeenCalledExactlyOnceWith("/admin/publications");
});

it("validates publishing, allows incomplete drafts, and recovers from a failed save", async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error("Try again")).mockResolvedValue(undefined);
  await render(<ProjectProvider request={request}><ProjectEditor id="new" /></ProjectProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  expect(request).not.toHaveBeenCalled();
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Name" })));
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "New draft" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect((screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement).value).toBe("New draft");
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(screen.getByRole("status", { name: "Project save status" }).textContent).toContain("Saved."));
});

it("publishes, unpublishes without losing edits, and confirms deletion", async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  await render(<ProjectProvider request={request}><ProjectEditor id="field-notes" /><Published /></ProjectProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Updated app" } });
  fireEvent.click(screen.getByRole("button", { name: "Update published" }));
  await waitFor(() => expect(screen.getByLabelText("Published name").textContent).toBe("Updated app"));
  fireEvent.click(screen.getByRole("button", { name: "Unpublish" }));
  fireEvent.click(screen.getByRole("button", { name: "Unpublish" }));
  await waitFor(() => expect(screen.getByLabelText("Published name").textContent).toBe("Unpublished"));
  expect((screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement).value).toBe("Updated app");
  fireEvent.click(screen.getByRole("button", { name: "Delete project" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(request).toHaveBeenCalledTimes(2);
  request.mockRejectedValueOnce(new Error("Deletion failed"));
  fireEvent.click(screen.getByRole("button", { name: "Delete project" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/projects"));
});

it("previews unsaved content on demand and restores editing focus and values", async () => {
  await render(<ProjectProvider><ProjectEditor id="field-notes" /></ProjectProvider>);
  expect(screen.queryByText("mobile device preview")).toBeNull();
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Unsaved preview" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview project" }));
  expect(await screen.findByRole("heading", { name: "Unsaved preview" })).toBeTruthy();
  expect(screen.getByText("mobile device preview")).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Exit project preview" }));
  expect(screen.getByRole("link", { name: "View Unsaved preview live" }).getAttribute("href")).toBe(labProjects[0].liveHref);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Exit project preview" }));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Preview project" })));
  expect((screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement).value).toBe("Unsaved preview");
  expect(screen.getByRole("status", { name: "Project save status" }).textContent).toContain("Unsaved changes");
  fireEvent.click(screen.getByRole("radio", { name: "Web" }));
  fireEvent.click(screen.getByRole("button", { name: "Preview project" }));
  expect(await screen.findByText("web device preview")).toBeTruthy();
});

it.each(["field-notes", "new"])("discards to the last saved project draft for %s without publishing", async (id) => {
  const request = vi.fn(async () => {});
  await render(<ProjectProvider request={request}><ProjectEditor id={id} /><Published /></ProjectProvider>);
  const name = screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement;
  const original = name.value;
  const published = screen.getByLabelText("Published name").textContent;
  const discard = screen.getByRole("button", { name: "Discard changes" });
  expect(discard.hasAttribute("disabled")).toBe(true);
  fireEvent.change(name, { target: { value: "Temporary edit" } });
  fireEvent.click(discard);
  expect(name.value).toBe(original);
  expect(request).not.toHaveBeenCalled();
  fireEvent.change(name, { target: { value: "Saved project draft" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(discard.hasAttribute("disabled")).toBe(true);
  await waitFor(() => expect(screen.getByRole("status", { name: "Project save status" }).textContent).toContain("Saved."));
  fireEvent.change(name, { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: /^(Publish|Update published)$/ }));
  await waitFor(() => expect(name.getAttribute("aria-invalid")).toBe("true"));
  fireEvent.click(discard);
  expect(name.value).toBe("Saved project draft");
  expect(name.getAttribute("aria-invalid")).not.toBe("true");
  expect(screen.getByRole("status", { name: "Project save status" }).textContent).toContain("No unsaved changes");
  expect(screen.getByLabelText("Published name").textContent).toBe(id === "new" ? "Unpublished" : published);
  expect(request).toHaveBeenCalledTimes(1);
});

it("saves an incomplete over-limit draft on implicit submission and never publishes", async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  await render(<ProjectProvider request={request}><ProjectEditor id="new" /><Published /></ProjectProvider>);
  const name = screen.getByRole("textbox", { name: "Name" });
  fireEvent.change(name, { target: { value: "Over-limit draft name" } });
  const form = name.closest("form");
  expect(form).toBeTruthy();
  expect(form!.noValidate).toBe(true);
  fireEvent.submit(form!);
  await waitFor(() => expect(screen.getByRole("status", { name: "Project save status" }).textContent).toContain("Saved."));
  expect(screen.getByLabelText("Published name").textContent).toBe("Unpublished");
  expect(request).toHaveBeenCalledTimes(1);
});

it("corrects blur errors without submit and saves drafts despite displayed publication errors", async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  await render(<ProjectProvider request={request}><ProjectEditor id="new" /></ProjectProvider>);
  const name = screen.getByRole("textbox", { name: "Name" });
  fireEvent.change(name, { target: { value: "a".repeat(12) } });
  expect(name.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.focus(name);
  fireEvent.blur(name);
  expect(name.getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByRole("textbox", { name: "Summary" }).getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.change(name, { target: { value: "a".repeat(11) } });
  expect(name.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
});

it("focuses URL before screenshot and updates conditional image-description errors", async () => {
  await render(<ProjectProvider><ProjectEditor id="field-notes" /></ProjectProvider>);
  const url = screen.getByRole("textbox", { name: "Live URL" });
  fireEvent.change(url, { target: { value: "http://example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Remove image" }));
  fireEvent.click(screen.getByRole("button", { name: "Update published" }));
  await waitFor(() => expect(document.activeElement).toBe(url));
  fireEvent.change(url, { target: { value: "https://example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Update published" }));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Choose image")));
  const alt = screen.getByRole("textbox", { name: "Image description" });
  fireEvent.change(alt, { target: { value: "" } });
  fireEvent.focus(alt);
  fireEvent.blur(alt);
  expect(alt.getAttribute("aria-invalid")).toBe("true");
  expect(screen.queryByRole("checkbox", { name: "Decorative image" })).toBeNull();
  expect(screen.getByRole("textbox", { name: "Image description" }).getAttribute("aria-invalid")).toBe("true");
});

it("clears failed replacement feedback on discard without losing the saved image", async () => {
  uploadImage.mockRejectedValueOnce(new Error("Choose a JPEG, PNG or WebP image."));
  await render(<ProjectProvider><ProjectEditor id="field-notes" /></ProjectProvider>);
  fireEvent.change(screen.getByLabelText("Replace image"), { target: { files: [new File(["bad"], "bad.txt", { type: "text/plain" })] } });
  expect((await screen.findByRole("alert")).textContent).toContain("JPEG, PNG or WebP");
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByLabelText("Replace image")).toBeTruthy();
});

it("unlocks fields after a failed save and permits correction and retry", async () => {
  let fail!: (reason: Error) => void;
  const request = vi.fn().mockImplementationOnce(() => new Promise<void>((_, reject) => { fail = reject; })).mockResolvedValue(undefined);
  await render(<ProjectProvider request={request}><ProjectEditor id="new" /></ProjectProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Submitted" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(screen.getByRole("textbox", { name: "Name" }).matches(":disabled")).toBe(true);
  await act(async () => fail(new Error("Save failure")));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByRole("textbox", { name: "Name" }).matches(":disabled")).toBe(false);
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Newer" } });
  expect(screen.queryByRole("alert")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(screen.getByRole("status", { name: "Project save status" }).textContent).toContain("Saved."));
});

it("ignores pending image replacement after unmount so late upload cannot change the draft", async () => {
  let finish!: (image: typeof uploadedScreenshot) => void;
  uploadImage.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const view = await render(<ProjectProvider><ProjectEditor id="field-notes" /></ProjectProvider>);
  const original = screen.getByRole("img").getAttribute("src");
  chooseScreenshot();
  await waitFor(() => expect(uploadImage).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("button", { name: "Discard changes" }).matches(":disabled")).toBe(true);
  view.unmount();
  await act(async () => finish(uploadedScreenshot));
  await render(<ProjectProvider><ProjectEditor id="field-notes" /></ProjectProvider>);
  expect(screen.getByRole("img").getAttribute("src")).toBe(original);
  expect(screen.getByRole("button", { name: "Discard changes" }).matches(":disabled")).toBe(true);
});

it("requires an image description after a publish attempt", async () => {
  await render(<ProjectProvider><ProjectEditor id="new" /></ProjectProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  expect(screen.getByRole("textbox", { name: "Image description" }).getAttribute("aria-invalid")).toBe("true");
});

it("opens a saved Project the server returns, even if it is absent from local demo content", async () => {
  mockProjectApi(async () => {}, [
    { id: "server-only", draft: { ...initialProjects()[0].draft, name: "Server Project" }, published: null },
  ]);
  renderPage(<CmsQueryProvider accountId="owner"><ProjectProvider><ProjectEditor id="server-only" /></ProjectProvider></CmsQueryProvider>, { wrapper: CmsShell });
  expect((await screen.findByRole("textbox", { name: "Name" }) as HTMLInputElement).value).toBe("Server Project");
});

it("reports a Project absent from the server as unavailable", async () => {
  mockProjectApi(async () => {}, []);
  renderPage(<CmsQueryProvider accountId="owner"><ProjectProvider><ProjectEditor id="missing" /></ProjectProvider></CmsQueryProvider>, { wrapper: CmsShell });
  expect(await screen.findByRole("heading", { name: "Project unavailable" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Back to projects" }));
  expect(push).toHaveBeenCalledWith("/admin/projects");
});

it("shows loading, then offers a retry when the Project list cannot be read", async () => {
  const list = vi.spyOn(projectApi, "list").mockRejectedValueOnce(new ApiRequestError("network", null));
  renderPage(<CmsQueryProvider accountId="owner"><ProjectProvider><ProjectEditor id="field-notes" /></ProjectProvider></CmsQueryProvider>, { wrapper: CmsShell });
  expect(await screen.findByRole("status", { name: "Loading project" })).toBeTruthy();
  await screen.findByRole("heading", { name: "Couldn’t load this project" });
  list.mockResolvedValue(initialProjects());
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("textbox", { name: "Name" })).toBeTruthy();
});


const uploadedScreenshot = {
  source: "https://example.supabase.co/storage/v1/object/public/media/screenshot.png",
  descriptor: { assetId: "12345678-1234-4234-8234-123456789abc", bucket: "media", path: "12345678-1234-4234-8234-123456789abc.png" },
};
function chooseScreenshot() {
  fireEvent.change(screen.getByLabelText("Replace image"), { target: { files: [new File(["image"], "screenshot.png", { type: "image/png" })] } });
}
it("uploads from the existing screenshot picker and locks actions until success", async () => {
  let finish!: (image: typeof uploadedScreenshot) => void;
  uploadImage.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  await render(<ProjectProvider><ProjectEditor id="field-notes" /></ProjectProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "My edits" } });
  chooseScreenshot();
  await waitFor(() => expect(uploadImage).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("button", { name: "Save draft" }).matches(":disabled")).toBe(true);
  expect(screen.getByRole("button", { name: "Update published" }).matches(":disabled")).toBe(true);
  expect(screen.getByRole("textbox", { name: "Name" }).matches(":disabled")).toBe(true);
  await act(async () => finish(uploadedScreenshot));
  await waitFor(() => expect(screen.getByAltText("Field Notes interface").getAttribute("src")).toBe(uploadedScreenshot.source));
  expect((screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement).value).toBe("My edits");
  expect(screen.getByRole("textbox", { name: "Name" }).matches(":disabled")).toBe(false);
});
it("retains the screenshot on upload failure, retries explicitly, and clears retry on removal", async () => {
  uploadImage.mockRejectedValueOnce(new Error("Upload failed. Retry or choose another image.")).mockResolvedValue(uploadedScreenshot);
  await render(<ProjectProvider><ProjectEditor id="field-notes" /></ProjectProvider>);
  const previous = screen.getByAltText("Field Notes interface").getAttribute("src");
  chooseScreenshot();
  const retry = await screen.findByRole("button", { name: "Retry upload" });
  expect(screen.getByAltText("Field Notes interface").getAttribute("src")).toBe(previous);
  expect(uploadImage).toHaveBeenCalledTimes(1);
  fireEvent.click(retry);
  await waitFor(() => expect(screen.getByAltText("Field Notes interface").getAttribute("src")).toBe(uploadedScreenshot.source));
  expect(uploadImage).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: "Remove image" }));
  expect(screen.queryByRole("button", { name: "Retry upload" })).toBeNull();
  expect(screen.queryByAltText("Field Notes interface")).toBeNull();
  expect(previous).not.toBe(uploadedScreenshot.source);
});
