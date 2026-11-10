import { CmsShell } from "./CmsShell";
import type { ReactNode } from "react";
import { labProjects } from "@/src/components/project-item/lab-projects";
import { ProjectProvider, useProjects } from "@/src/cms/ProjectProvider";
import { act, fireEvent, render as renderPage, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProjectEditor } from "./ProjectEditor";
import { ProjectList } from "./ProjectList";
function render(ui: ReactNode) { return renderPage(ui, { wrapper: CmsShell }); }

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/admin/publications" }));

vi.mock("@/src/components/project-item/ProjectDeviceStage", () => ({
  ProjectDeviceStage: ({ platform }: { platform: string }) => <p>{platform} device preview</p>,
}));

async function chooseStatus(label: string) {
  fireEvent.click(screen.getByRole("button", { name: /Status/ }));
  fireEvent.click(await screen.findByRole("option", { name: label }));
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  });
  push.mockReset();
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
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(Element.prototype, "getAnimations");
});


function Published() { const { records } = useProjects(); return <output aria-label="Published name">{records[0]?.published?.name ?? "Unpublished"}</output>; }

it("keeps edits made during save dirty and leaves published content intact", async () => {
  let finish!: () => void;
  const request = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  render(<ProjectProvider request={request}><ProjectEditor id="field-notes" /><Published /></ProjectProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Submitted" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Still editing" } });
  await act(async () => finish());
  expect(screen.getByRole("status", { name: "Project save status" }).textContent).toContain("Unsaved changes");
  expect(screen.getByLabelText("Published name").textContent).toBe("Field Notes");
  fireEvent.click(screen.getByRole("button", { name: "Publications" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(push).toHaveBeenCalledExactlyOnceWith("/admin/publications");
});

it("validates publishing, allows incomplete drafts, and recovers from a failed save", async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error("Try again")).mockResolvedValue(undefined);
  render(<ProjectProvider request={request}><ProjectEditor id="new" /></ProjectProvider>);
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
  render(<ProjectProvider request={request}><ProjectEditor id="field-notes" /><Published /></ProjectProvider>);
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

it("lists current fixtures and distinguishes no search results", () => {
  render(<ProjectProvider><ProjectList /></ProjectProvider>);
  expect(screen.getByRole("heading", { name: "Field Notes" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Relay" })).toBeTruthy();
  fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), { target: { value: "missing" } });
  expect(screen.getByRole("heading", { name: "No matching projects" })).toBeTruthy();
});

it("previews unsaved content on demand and restores editing focus and values", async () => {
  render(<ProjectProvider><ProjectEditor id="field-notes" /></ProjectProvider>);
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

it("reorders whole projects and disables ordering in filtered results and at boundaries", async () => {
  render(<ProjectProvider><ProjectList /><Published /></ProjectProvider>);
  expect(screen.getByRole("button", { name: "Move Field Notes up" }).hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Move Relay up" }));
  const list = screen.getByRole("list");
  expect(within(list).getAllByRole("heading").map((heading) => heading.textContent)).toEqual(["Relay", "Field Notes"]);
  expect(screen.getByLabelText("Published name").textContent).toBe("Relay");
  expect(screen.getByRole("status", { name: "Project order" }).textContent).toContain("position 1 of 2");
  await chooseStatus("Published");
  expect(within(list).getAllByRole("heading")).toHaveLength(2);
  expect(screen.getByRole("button", { name: "Move Relay down" }).hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Move Relay down" }));
  await chooseStatus("All projects");
  expect(within(list).getAllByRole("heading").map((heading) => heading.textContent)).toEqual(["Relay", "Field Notes"]);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), { target: { value: "Relay" } });
  expect(screen.getByRole("button", { name: "Move Relay down" }).hasAttribute("disabled")).toBe(true);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Move Relay down" }));
  expect(within(list).getAllByRole("heading").map((heading) => heading.textContent)).toEqual(["Field Notes", "Relay"]);
});

it.each(["field-notes", "new"])("discards to the last saved project draft for %s without publishing", async (id) => {
  const request = vi.fn(async () => {});
  render(<ProjectProvider request={request}><ProjectEditor id={id} /><Published /></ProjectProvider>);
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

function FilterExamples() {
  const { records, commit } = useProjects();
  return <button onClick={async () => {
    const fieldNotes = records.find((item) => item.id === "field-notes")!;
    const relay = records.find((item) => item.id === "relay")!;
    await commit(fieldNotes.id, { ...fieldNotes.draft, summary: "Draft revision" }, "save");
    await commit(relay.id, relay.draft, "unpublish");
  }}>Prepare filter examples</button>;
}

it("combines project search and status, clears both filters, and preserves whole-list order", async () => {
  render(<ProjectProvider request={async () => {}}><ProjectList /><FilterExamples /></ProjectProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Prepare filter examples" }));
  await screen.findByText("Draft");
  const search = screen.getByRole("searchbox", { name: "Search projects" }) as HTMLInputElement;
  await chooseStatus("Drafts");
  expect(screen.getByRole("heading", { name: "Relay" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Field Notes" })).toBeNull();
  fireEvent.change(search, { target: { value: "  FIELD  " } });
  expect(screen.getByRole("heading", { name: "No matching projects" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(search.value).toBe("");
  expect(screen.getByRole("button", { name: /Status/ }).textContent).toContain("All projects");
  const names = () => within(screen.getByRole("list")).getAllByRole("heading").map((heading) => heading.textContent);
  expect(names()).toEqual(["Field Notes", "Relay"]);
  await chooseStatus("Published");
  expect(screen.getByRole("heading", { name: "Field Notes" })).toBeTruthy();
  expect(screen.getByText("Published · Unpublished changes")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Relay" })).toBeNull();
  fireEvent.change(search, { target: { value: "  DRAFT REVISION  " } });
  expect(screen.getByRole("heading", { name: "Field Notes" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Move Field Notes down" }).hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Move Field Notes down" }));
  fireEvent.change(search, { target: { value: "" } });
  await chooseStatus("All projects");
  expect(names()).toEqual(["Field Notes", "Relay"]);
  expect(screen.getByRole("button", { name: "Move Field Notes down" }).hasAttribute("disabled")).toBe(false);
});

it("mounts the full published project section on demand and restores filtered list state", async () => {
  render(<ProjectProvider request={async () => {}}><ProjectList /><FilterExamples /></ProjectProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Prepare filter examples" }));
  await screen.findByText("Draft");
  fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), { target: { value: "Relay" } });
  await chooseStatus("Drafts");
  expect(screen.queryByText("mobile device preview")).toBeNull();
  vi.stubGlobal("scrollY", 480);
  fireEvent.click(screen.getByRole("button", { name: "Preview projects" }));
  expect(await screen.findByRole("article", { name: "Field Notes" })).toBeTruthy();
  expect(screen.queryByRole("article", { name: "Relay" })).toBeNull();
  expect(screen.queryByText("Draft revision")).toBeNull();
  expect(screen.getByText("mobile device preview")).toBeTruthy();
  expect(screen.queryByRole("navigation", { name: "Content navigation" })).toBeNull();
  expect(screen.getByRole("link", { name: "View Field Notes live" }).getAttribute("href")).toBe(labProjects[0].liveHref);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.keyDown(window, { key: "Escape" });
  expect((screen.getByRole("searchbox", { name: "Search projects" }) as HTMLInputElement).value).toBe("Relay");
  expect(screen.getByRole("button", { name: /Status/ }).textContent).toContain("Drafts");
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Preview projects" }));
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 480, behavior: "instant" });
  expect(screen.queryByText("mobile device preview")).toBeNull();
});

it("renders the published project stack in current demo order", async () => {
  render(<ProjectProvider><ProjectList /></ProjectProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Move Relay up" }));
  fireEvent.click(screen.getByRole("button", { name: "Preview projects" }));
  await screen.findByRole("article", { name: "Relay" });
  expect(screen.getAllByRole("article").map((article) => within(article).getByRole("heading").textContent)).toEqual(["Relay", "Field Notes"]);
  fireEvent.click(screen.getByRole("button", { name: "Exit project section preview" }));
  expect(within(screen.getByRole("list")).getAllByRole("heading").map((heading) => heading.textContent)).toEqual(["Relay", "Field Notes"]);
});

function WithdrawProjects() {
  const { records, commit } = useProjects();
  return <button onClick={async () => {
    for (const record of records) await commit(record.id, record.draft, "unpublish");
  }}>Withdraw demo projects</button>;
}

it("shows an empty project section when every record is unpublished", async () => {
  render(<ProjectProvider request={async () => {}}><ProjectList /><WithdrawProjects /></ProjectProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Withdraw demo projects" }));
  await waitFor(() => expect(screen.getAllByText("Draft")).toHaveLength(2));
  fireEvent.click(screen.getByRole("button", { name: "Preview projects" }));
  expect(await screen.findByRole("heading", { name: "No published projects" })).toBeTruthy();
  expect(screen.queryByRole("article")).toBeNull();
  expect(screen.queryByText("mobile device preview")).toBeNull();
});

it("saves an incomplete over-limit draft on implicit submission and never publishes", async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  render(<ProjectProvider request={request}><ProjectEditor id="new" /><Published /></ProjectProvider>);
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
  render(<ProjectProvider request={request}><ProjectEditor id="new" /></ProjectProvider>);
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
  render(<ProjectProvider><ProjectEditor id="field-notes" /></ProjectProvider>);
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
  fireEvent.click(screen.getByRole("checkbox", { name: "Decorative image" }));
  expect(screen.queryByRole("textbox", { name: "Image description" })).toBeNull();
  fireEvent.click(screen.getByRole("checkbox", { name: "Decorative image" }));
  expect(screen.getByRole("textbox", { name: "Image description" }).getAttribute("aria-invalid")).toBe("true");
});

it("clears failed replacement feedback on discard without losing the saved image", () => {
  render(<ProjectProvider><ProjectEditor id="field-notes" /></ProjectProvider>);
  fireEvent.change(screen.getByLabelText("Replace image"), { target: { files: [new File(["bad"], "bad.txt", { type: "text/plain" })] } });
  expect(screen.getByRole("alert").textContent).toContain("JPEG, PNG or WebP");
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByLabelText("Replace image")).toBeTruthy();
});

it("suppresses a failed save after newer edits and permits retry", async () => {
  let fail!: (reason: Error) => void;
  const request = vi.fn().mockImplementationOnce(() => new Promise<void>((_, reject) => { fail = reject; })).mockResolvedValue(undefined);
  render(<ProjectProvider request={request}><ProjectEditor id="new" /></ProjectProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Submitted" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Newer" } });
  await act(async () => fail(new Error("Obsolete failure")));
  expect(screen.queryByRole("alert")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(screen.getByRole("status", { name: "Project save status" }).textContent).toContain("Saved."));
});

it("cancels a pending image replacement on discard so late decoding cannot replace the baseline", async () => {
  let finish!: () => void;
  const decode = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: decode });
  try {
    render(<ProjectProvider><ProjectEditor id="field-notes" /></ProjectProvider>);
    const original = screen.getByRole("img").getAttribute("src");
    fireEvent.change(screen.getByLabelText("Replace image"), { target: { files: [new File(["image"], "new.png", { type: "image/png" })] } });
    await waitFor(() => expect(decode).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    await act(async () => finish());
    expect(screen.getByRole("img").getAttribute("src")).toBe(original);
    expect(screen.queryByText("new.png selected.")).toBeNull();
    expect(screen.getByRole("button", { name: "Discard changes" }).hasAttribute("disabled")).toBe(true);
  } finally {
    Reflect.deleteProperty(HTMLImageElement.prototype, "decode");
  }
});

it("shows newly active image-description requirements after a publish attempt", () => {
  render(<ProjectProvider><ProjectEditor id="new" /></ProjectProvider>);
  fireEvent.click(screen.getByRole("checkbox", { name: "Decorative image" }));
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Decorative image" }));
  expect(screen.getByRole("textbox", { name: "Image description" }).getAttribute("aria-invalid")).toBe("true");
});
