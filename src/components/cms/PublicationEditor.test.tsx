import { CmsShell } from "./CmsShell";
import type { ReactNode } from "react";
import { CmsProvider, useCms } from "@/src/cms/CmsProvider";
import { initialPublications } from "@/src/cms/publication-fixtures";
import {
act,
fireEvent,
render as renderPage,
screen,
waitFor,
within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicationEditor } from "./PublicationEditor";
import { PublicationList } from "./PublicationList";

function render(ui: ReactNode) { return renderPage(ui, { wrapper: CmsShell }); }

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/admin/publications" }));

async function chooseStatus(label: string) {
  fireEvent.click(screen.getByRole("button", { name: /Status/ }));
  fireEvent.click(await screen.findByRole("option", { name: label }));
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
}

beforeEach(() => {
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

function PublishedReader() {
  const { records } = useCms();
  return (
    <output aria-label="Demo published title">
      {records[0]?.published?.title ?? "Unpublished"}
    </output>
  );
}

it.each(["", "Recovered article text"])("restores a legacy external draft as an editable internal article: %s", (bodyMarkdown) => {
  const record = initialPublications()[0];
  localStorage.setItem("portfolio:cms-drafts:v1:publications:publication-1", JSON.stringify({
    id: record.id,
    value: { ...record.draft, title: "Recovered title", bodyMarkdown, kind: "external", externalUrl: "https://example.com/old" },
  }));
  render(<CmsProvider><PublicationEditor id={record.id} /></CmsProvider>);
  expect((screen.getByRole("textbox", { name: "Title" }) as HTMLInputElement).value).toBe("Recovered title");
  expect(screen.queryByRole("radiogroup", { name: "Publication type" })).toBeNull();
  expect(screen.queryByRole("textbox", { name: "Publication URL" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: bodyMarkdown ? "Edit article" : "Write article" }));
  expect((screen.getByRole("textbox", { name: "Article" }) as HTMLTextAreaElement).value).toBe(bodyMarkdown);
});

describe("publication CMS", () => {
  it("previews unsaved content with the public article and returns without publishing or losing edits", async () => {
    render(
      <CmsProvider>
        <PublicationEditor id="publication-1" />
        <PublishedReader />
      </CmsProvider>,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "My unsaved story" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview card" }));
    expect(
      await screen.findByRole("article", { name: "My unsaved story" }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Exit publication preview" }));
    fireEvent.click(screen.getByRole("button", { name: "Exit publication preview" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Preview card" }));
    vi.stubGlobal("scrollY", 420);
    fireEvent.click(
      screen.getByRole("button", { name: "Preview article" }),
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "My unsaved story",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("navigation", { name: "Article sections" }),
    ).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
    expect(
      screen.queryByRole("navigation", { name: "Content navigation" }),
    ).toBeNull();
    expect(screen.getByLabelText("Demo published title").textContent).toBe(
      initialPublications()[0].draft.title,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Preview article" }));
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 420, behavior: "instant" });
    expect(
      (
        (await screen.findByRole("textbox", {
          name: "Title",
        })) as HTMLInputElement
      ).value,
    ).toBe("My unsaved story");
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
  });

  it("preserves edits made while saving and keeps the published copy unchanged", async () => {
    let finish: () => void = () => {
      throw new Error("Request has not started");
    };
    const request = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <CmsProvider request={request}>
        <PublicationEditor id="publication-1" />
        <PublishedReader />
      </CmsProvider>,
    );
    const title = screen.getByRole("textbox", { name: "Title" });
    fireEvent.change(title, { target: { value: "Submitted draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    fireEvent.change(title, { target: { value: "Still typing" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await act(async () => finish());
    expect(request).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Saved.")).toBeNull();
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
    expect((title as HTMLInputElement).value).toBe("Still typing");
    expect(screen.getByText("Published · Unpublished changes")).toBeTruthy();
    expect(screen.getByLabelText("Demo published title").textContent).toBe(
      initialPublications()[0].draft.title,
    );
  });

  it("retains a failed save and can retry successfully", async () => {
    const request = vi.fn().mockRejectedValueOnce(new Error("Save failed. Try again.")).mockResolvedValue(undefined);
    render(
      <CmsProvider request={request}>
        <PublicationEditor id="publication-1" />
      </CmsProvider>,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Retain this draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(
      (screen.getByRole("textbox", { name: "Title" }) as HTMLInputElement)
        .value,
    ).toBe("Retain this draft");
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByText("Saved.")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("allows incomplete drafts but blocks publishing and focuses the missing title", async () => {
    const request = vi.fn(async () => {});
    render(
      <CmsProvider request={request}>
        <PublicationEditor id="new" />
      </CmsProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByText("Saved.");
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(
      await screen.findByText("Add a title before publishing."),
    ).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("textbox", { name: "Title" }),
      ),
    );
    expect(request).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole("button", { name: "Preview article" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Untitled publication" }),
    ).toBeTruthy();
    expect(screen.getByText(/Preview placeholders/)).toBeTruthy();
  });

  it("previews publication cards with internal article destinations", async () => {
    render(
      <CmsProvider>
        <PublicationEditor id="publication-2" />
      </CmsProvider>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Preview card" }),
    );
    expect(
      screen.queryByRole("navigation", { name: "Article sections" }),
    ).toBeNull();
    expect(screen.getByRole("link", { name: "Read Designing with productive constraints" }).getAttribute("href")).toBe("/publication-details-lab");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("combines search and status filters", async () => {
    const records = initialPublications();
    records[0].published = null;
    records[1].draft.summary = "An unpublished revision";
    render(
      <CmsProvider initialRecords={records}>
        <PublicationList />
      </CmsProvider>,
    );
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search publications" }),
      { target: { value: "TRUST" } },
    );
    expect(
      screen.getByRole("heading", { name: records[0].draft.title }),
    ).toBeTruthy();
    await chooseStatus("Published");
    expect(screen.getByText("No matching publications")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(
      screen.getByRole("heading", { name: records[1].draft.title }),
    ).toBeTruthy();
    expect((screen.getByRole("searchbox", { name: "Search publications" }) as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("button", { name: /Status/ }).textContent).toContain("All publications");
    await chooseStatus("Published");
    fireEvent.change(screen.getByRole("searchbox", { name: "Search publications" }), { target: { value: "  UNPUBLISHED REVISION  " } });
    expect(screen.getByRole("heading", { name: records[1].draft.title })).toBeTruthy();
    expect(screen.getByText("Published · Unpublished changes")).toBeTruthy();
  });

  it("publishes the working copy and confirms withdrawal without deleting content", async () => {
    render(
      <CmsProvider request={async () => {}}>
        <PublicationEditor id="publication-1" />
        <PublishedReader />
      </CmsProvider>,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Ready for readers" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update published" }));
    await screen.findByText("Published.");
    expect(screen.getByLabelText("Demo published title").textContent).toBe(
      "Ready for readers",
    );
    fireEvent.click(screen.getByRole("button", { name: "Unpublish" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Unpublish this publication?",
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Unpublish" }),
    );
    await screen.findByText(
      "Unpublished. Your draft is still available.",
    );
    expect(screen.getByLabelText("Demo published title").textContent).toBe(
      "Unpublished",
    );
    expect(
      (screen.getByRole("textbox", { name: "Title" }) as HTMLInputElement)
        .value,
    ).toBe("Ready for readers");
  });
});


it("keeps a selected cover through full-screen card preview and return to editing", async () => {
  Object.defineProperty(HTMLImageElement.prototype, "decode", {
    configurable: true, value: () => Promise.resolve(),
  });
  try {
    render(<CmsProvider><PublicationEditor id="publication-1" /></CmsProvider>);
    fireEvent.change(screen.getByLabelText("Replace image"), {
      target: { files: [new File(["image"], "selected.png", { type: "image/png" })] },
    });
    await screen.findByText("selected.png selected.");
    const source = document.querySelector('img[src^="data:"]')?.getAttribute("src");
    expect(source).toMatch(/^data:image\/png/);
    fireEvent.click(screen.getByRole("button", { name: "Preview card" }));
    await waitFor(() => expect(document.querySelector('img[src^="data:"]')?.getAttribute("src")).toBe(source));
    fireEvent.click(screen.getByRole("button", { name: "Exit publication preview" }));
    await screen.findByLabelText("Replace image");
    expect(document.querySelector('img[src^="data:"]')?.getAttribute("src")).toBe(source);
    fireEvent.click(screen.getByRole("button", { name: "Remove image" }));
    expect(await screen.findByText("No image selected")).toBeTruthy();
  } finally {
    Reflect.deleteProperty(HTMLImageElement.prototype, "decode");
  }
});

it("keeps publication list row actions limited to ordering", () => {
  const request = vi.fn(async () => {});
  const record = initialPublications()[0];
  render(<CmsProvider initialRecords={[record]} request={request}><PublicationList /></CmsProvider>);
  expect(within(screen.getByRole("list")).getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([`Move ${record.draft.title} up`, `Move ${record.draft.title} down`]);
  expect(screen.getByRole("link", { name: new RegExp(record.draft.title) }).getAttribute("href")).toBe(`/admin/publications/${record.id}`);
  expect(screen.queryByRole("button", { name: /Delete/ })).toBeNull();
  expect(request).not.toHaveBeenCalled();
});

it("deduplicates removable tags and preserves article content when reopening the writer", async () => {
  render(<CmsProvider><PublicationEditor id="publication-1" /></CmsProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Tags" }), { target: { value: "React, react, Writing" } });
  expect(screen.getAllByRole("button", { name: "Remove tag React" })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Remove tag React" }));
  expect((screen.getByRole("textbox", { name: "Tags" }) as HTMLInputElement).value).toBe("Writing");
  fireEvent.click(screen.getByRole("button", { name: "Edit article" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Article" }), { target: { value: "Keep my article" } });
  fireEvent.click(screen.getByRole("button", { name: "Back to publication" }));
  fireEvent.click(screen.getByRole("button", { name: "Edit article" }));
  expect((screen.getByRole("textbox", { name: "Article" }) as HTMLTextAreaElement).value).toBe("Keep my article");
  fireEvent.click(screen.getByRole("button", { name: "Back to publication" }));
  expect(screen.queryByRole("radiogroup", { name: "Publication type" })).toBeNull();
  expect(screen.queryByRole("textbox", { name: "Publication URL" })).toBeNull();
  expect(screen.getByText("Published · Unpublished changes")).toBeTruthy();
  const description = screen.getByRole("textbox", { name: "Image description" }) as HTMLInputElement;
  const originalAlt = description.value;
  expect(screen.queryByRole("checkbox", { name: "Decorative image" })).toBeNull();
  expect((screen.getByRole("textbox", { name: "Image description" }) as HTMLInputElement).value).toBe(originalAlt);
});

it.each(["publication-1", "new"])("discards to the last saved publication draft for %s without publishing", async (id) => {
  const request = vi.fn(async () => {});
  render(<CmsProvider request={request}><PublicationEditor id={id} /><PublishedReader /></CmsProvider>);
  const title = screen.getByRole("textbox", { name: "Title" }) as HTMLInputElement;
  const original = title.value;
  const published = screen.getByLabelText("Demo published title").textContent;
  const discard = screen.getByRole("button", { name: "Discard changes" });
  expect(discard.hasAttribute("disabled")).toBe(true);
  fireEvent.change(title, { target: { value: "Temporary edit" } });
  fireEvent.click(discard);
  expect(title.value).toBe(original);
  expect(request).not.toHaveBeenCalled();
  fireEvent.change(title, { target: { value: "Saved draft only" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(discard.hasAttribute("disabled")).toBe(true);
  await screen.findByText("Saved.");
  fireEvent.change(title, { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: /^(Publish|Update published)$/ }));
  await screen.findByText("Add a title before publishing.");
  fireEvent.click(discard);
  expect(title.value).toBe("Saved draft only");
  expect(screen.queryByText("Add a title before publishing.")).toBeNull();
  expect(screen.getByRole("status", { name: "Publication save status" }).textContent).toContain("No unsaved changes");
  expect(screen.getByLabelText("Demo published title").textContent).toBe(id === "new" ? "Unpublished" : published);
  expect(request).toHaveBeenCalledTimes(1);
});

it("confirms editor deletion, preserves unsaved edits on cancel/failure, and blocks duplicate pending requests", async () => {
  let finish!: () => void;
  const request = vi.fn().mockRejectedValueOnce(new Error("Deletion failed. Try again."))
    .mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
  const record = initialPublications()[0];
  render(<CmsProvider initialRecords={[record]} request={request}><PublicationEditor id={record.id} /><PublishedReader /></CmsProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Unsaved delete title" } });
  fireEvent.click(screen.getByRole("button", { name: "Delete publication" }));
  const confirmation = await screen.findByRole("dialog", { name: "Delete this publication?" });
  expect(within(confirmation).getByText(/Unsaved delete title/)).toBeTruthy();
  fireEvent.click(within(confirmation).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(request).not.toHaveBeenCalled();
  expect((screen.getByRole("textbox", { name: "Title" }) as HTMLInputElement).value).toBe("Unsaved delete title");
  fireEvent.click(screen.getByRole("button", { name: "Delete publication" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  const retryDialog = await screen.findByRole("dialog", { name: "Delete this publication?" });
  expect(await within(retryDialog).findByRole("alert")).toBeTruthy();
  expect(screen.getByLabelText("Demo published title").textContent).toBe(record.draft.title);
  expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("Unsaved delete title");
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(within(retryDialog).getByRole("button", { name: "Delete" }));
  fireEvent.click(within(retryDialog).getByRole("button", { name: "Delete" }));
  fireEvent.click(within(retryDialog).getByRole("button", { name: "Cancel" }));
  fireEvent.keyDown(retryDialog, { key: "Escape" });
  expect(screen.getByRole("dialog", { name: "Delete this publication?" })).toBeTruthy();
  expect(request).toHaveBeenCalledTimes(2);
  await act(async () => finish());
  await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/publications"));
  expect(screen.getByLabelText("Demo published title").textContent).toBe("Unpublished");
});

it("offers editor deletion only after a new publication draft is saved", async () => {
  render(<CmsProvider request={async () => {}}><PublicationEditor id="new" /></CmsProvider>);
  expect(screen.queryByRole("button", { name: "Delete publication" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await screen.findByText("Saved.");
  fireEvent.click(screen.getByRole("button", { name: "Delete publication" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/publications"));
});

it("previews the full published publication section independently of filters and saved draft changes", async () => {
  const records = initialPublications();
  const publishedTitle = records[0].published!.title;
  records[0].draft.title = "Saved draft revision";
  records[1].published = null;
  render(<CmsProvider initialRecords={records}><PublicationList /></CmsProvider>);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search publications" }), { target: { value: "Saved draft revision" } });
  await chooseStatus("Drafts");
  vi.stubGlobal("scrollY", 640);
  fireEvent.click(screen.getByRole("button", { name: "Preview publications" }));
  expect(await screen.findByRole("article", { name: publishedTitle })).toBeTruthy();
  expect(screen.getAllByRole("article")).toHaveLength(records.length - 1);
  expect(screen.queryByRole("article", { name: records[1].draft.title })).toBeNull();
  expect(screen.queryByText("Saved draft revision")).toBeNull();
  expect(screen.queryByRole("navigation", { name: "Content navigation" })).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Exit publication section preview" }));
  expect(screen.getByRole("link", { name: `Read ${records[2].draft.title}` }).getAttribute("href")).toBe("/publication-details-lab");
  expect(screen.getByRole("link", { name: `Read ${publishedTitle}` }).getAttribute("href")).toBe("/publication-details-lab");
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.keyDown(window, { key: "Escape" });
  expect((screen.getByRole("searchbox", { name: "Search publications" }) as HTMLInputElement).value).toBe("Saved draft revision");
  expect(screen.getByRole("button", { name: /Status/ }).textContent).toContain("Drafts");
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Preview publications" }));
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 640, behavior: "instant" });
});

it("shows a truthful publication section empty state when nothing is demo-published", async () => {
  const records = initialPublications().map((record) => ({ ...record, published: null }));
  render(<CmsProvider initialRecords={records}><PublicationList /></CmsProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Preview publications" }));
  expect(await screen.findByRole("heading", { name: "No published publications" })).toBeTruthy();
  expect(screen.queryByRole("article")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Exit publication section preview" }));
  expect(screen.getByRole("heading", { name: records[0].draft.title })).toBeTruthy();
});

it("reorders whole publications, preserves focus and snapshots, and uses the same order in section preview", async () => {
  const records = initialPublications();
  records[0].draft.title = "Saved draft revision";
  records[3].published = null;
  const request = vi.fn(async () => {});
  render(<CmsProvider initialRecords={records} request={request}><PublicationList /></CmsProvider>);
  const move = screen.getByRole("button", { name: `Move ${records[2].draft.title} up` });
  move.focus();
  fireEvent.click(move);
  const expected = [records[0].draft.title, records[2].draft.title, records[1].draft.title, records[3].draft.title];
  const names = () => within(screen.getByRole("list")).getAllByRole("heading").map((heading) => heading.textContent);
  expect(names()).toEqual(expected);
  expect(document.activeElement).toBe(move);
  expect(screen.getByRole("button", { name: "Move Saved draft revision up" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("button", { name: `Move ${records[3].draft.title} down` }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("status", { name: "Publication order" }).textContent).toContain("position 2 of 4");
  fireEvent.click(screen.getByRole("button", { name: `Move ${records[2].draft.title} down` }));
  expect(names()).toEqual(records.map((record) => record.draft.title));
  fireEvent.click(move);
  expect(names()).toEqual(expected);
  await chooseStatus("Published");
  expect(screen.getByRole("button", { name: `Move ${records[1].draft.title} down` }).hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: `Move ${records[1].draft.title} down` }));
  fireEvent.change(screen.getByRole("searchbox", { name: "Search publications" }), { target: { value: "not a match" } });
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(names()).toEqual(expected);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search publications" }), { target: { value: "Saved draft revision" } });
  expect(screen.getByRole("button", { name: "Move Saved draft revision down" }).hasAttribute("disabled")).toBe(true);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search publications" }), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview publications" }));
  await screen.findByRole("article", { name: records[1].published!.title });
  expect(screen.getAllByRole("article").map((article) => within(article).getByRole("heading").textContent))
    .toEqual([records[0].published!.title, records[2].published!.title, records[1].published!.title]);
  expect(screen.queryByText("Saved draft revision")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Exit publication section preview" }));
  expect(names()).toEqual(expected);
  expect(request).not.toHaveBeenCalled();
});

function SavePublicationExample() {
  const { records, commit } = useCms();
  return <button onClick={() => void commit(records[0].id, records[0].draft, "save")}>Save publication example</button>;
}

it("disables publication ordering during a pending request without changing order", async () => {
  let finish!: () => void;
  const records = initialPublications();
  const request = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  render(<CmsProvider initialRecords={records} request={request}><PublicationList /><SavePublicationExample /></CmsProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Save publication example" }));
  const move = screen.getByRole("button", { name: `Move ${records[1].draft.title} up` });
  expect(move.hasAttribute("disabled")).toBe(true);
  fireEvent.click(move);
  await act(async () => finish());
  expect(within(screen.getByRole("list")).getAllByRole("heading").map((heading) => heading.textContent)).toEqual(records.map((record) => record.draft.title));
  expect(move.hasAttribute("disabled")).toBe(false);
  expect(request).toHaveBeenCalledTimes(1);
});

it("keeps the unpublish confirmation open while the request is pending", async () => {
  let finish!: () => void;
  const request = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  render(<CmsProvider request={request}><PublicationEditor id="publication-1" /><PublishedReader /></CmsProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Unpublish" }));
  const dialog = await screen.findByRole("dialog", { name: "Unpublish this publication?" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Unpublish" }));
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  expect(screen.getByRole("dialog", { name: "Unpublish this publication?" })).toBe(dialog);
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => finish());
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByLabelText("Demo published title").textContent).toBe("Unpublished");
});

it("implicitly saves incomplete over-limit drafts without publishing", async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  render(<CmsProvider request={request}><PublicationEditor id="new" /><PublishedReader /></CmsProvider>);
  const title = screen.getByRole("textbox", { name: "Title" });
  fireEvent.change(title, { target: { value: "a".repeat(41) } });
  const form = title.closest("form");
  expect(form).toBeTruthy();
  expect(form!.noValidate).toBe(true);
  fireEvent.submit(form!);
  await screen.findByText("Saved.");
  expect(screen.getByLabelText("Demo published title").textContent).toBe("Unpublished");
  expect(request).toHaveBeenCalledTimes(1);
});

it("corrects title and parsed tag errors live without blocking draft saves", async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  render(<CmsProvider request={request}><PublicationEditor id="new" /></CmsProvider>);
  const title = screen.getByRole("textbox", { name: "Title" });
  fireEvent.change(title, { target: { value: "a".repeat(41) } });
  expect(title.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.focus(title); fireEvent.blur(title);
  expect(title.getAttribute("aria-invalid")).toBe("true");
  fireEvent.change(title, { target: { value: "Corrected" } });
  expect(title.getAttribute("aria-invalid")).not.toBe("true");
  const tags = screen.getByRole("textbox", { name: "Tags" });
  fireEvent.change(tags, { target: { value: "one,two,three,four" } });
  fireEvent.focus(tags); fireEvent.blur(tags);
  expect(tags.getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByText("Use 3 tags or fewer.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Remove tag four" }));
  expect(tags.getAttribute("aria-invalid")).not.toBe("true");
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await screen.findByText("Saved.");
  expect(request).toHaveBeenCalledTimes(1);
});

it("clears the required article error after writing content following an incomplete Publish", async () => {
  render(<CmsProvider><PublicationEditor id="new" /></CmsProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  expect(screen.getByRole("button", { name: "Write article" }).getAttribute("aria-describedby")).toBe("publication-body-error");
  expect(screen.getByText("Write your article before publishing.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Write article" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Article" }), { target: { value: "My internal article" } });
  fireEvent.click(screen.getByRole("button", { name: "Back to publication" }));
  expect(screen.queryByText("Write your article before publishing.")).toBeNull();
  expect(screen.getByRole("button", { name: "Edit article" })).toBeTruthy();
});

it("focuses tags before cover and requires an image description", async () => {
  render(<CmsProvider><PublicationEditor id="publication-1" /></CmsProvider>);
  const tags = screen.getByRole("textbox", { name: "Tags" });
  fireEvent.change(tags, { target: { value: "a".repeat(17) } });
  fireEvent.click(screen.getByRole("button", { name: "Remove image" }));
  fireEvent.click(screen.getByRole("button", { name: "Update published" }));
  await waitFor(() => expect(document.activeElement).toBe(tags));
  fireEvent.change(tags, { target: { value: "Valid" } });
  fireEvent.click(screen.getByRole("button", { name: "Update published" }));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Choose image")));
  const alt = screen.getByRole("textbox", { name: "Image description" });
  fireEvent.change(alt, { target: { value: "" } });
  fireEvent.focus(alt); fireEvent.blur(alt);
  expect(alt.getAttribute("aria-invalid")).toBe("true");
  expect(screen.queryByRole("checkbox", { name: "Decorative image" })).toBeNull();
});

it("discards failed cover feedback even when the saved content did not change", () => {
  render(<CmsProvider><PublicationEditor id="publication-1" /></CmsProvider>);
  fireEvent.change(screen.getByLabelText("Replace image"), { target: { files: [new File(["bad"], "bad.txt", { type: "text/plain" })] } });
  expect(screen.getByRole("alert").textContent).toContain("JPEG, PNG or WebP");
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByLabelText("Replace image")).toBeTruthy();
});

it("suppresses stale save failures after newer edits and permits retry", async () => {
  let fail!: (reason: Error) => void;
  const request = vi.fn().mockImplementationOnce(() => new Promise<void>((_, reject) => { fail = reject; })).mockResolvedValue(undefined);
  render(<CmsProvider request={request}><PublicationEditor id="new" /></CmsProvider>);
  const title = screen.getByRole("textbox", { name: "Title" });
  fireEvent.change(title, { target: { value: "Submitted" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  fireEvent.change(title, { target: { value: "Newer" } });
  await act(async () => fail(new Error("Obsolete failure")));
  expect(screen.queryByRole("alert")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await screen.findByText("Saved.");
});

it("writes before the first save and returns to the form with edits, focus and scroll intact", async () => {
  const request = vi.fn(async () => {});
  render(<CmsProvider request={request}><PublicationEditor id="new" /></CmsProvider>);
  expect(screen.queryByRole("textbox", { name: "Article" })).toBeNull();
  vi.stubGlobal("scrollY", 400);
  fireEvent.click(screen.getByRole("button", { name: "Write article" }));
  expect(screen.getByRole("region", { name: "Article writing workspace" })).toBeTruthy();
  expect(screen.queryByRole("navigation", { name: "Content navigation" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Publish" })).toBeNull();
  fireEvent.change(screen.getByRole("textbox", { name: "Article" }), { target: { value: "## My heading\n\nA **clear** story." } });
  fireEvent.click(screen.getByRole("button", { name: "Back to publication" }));
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Edit article" }));
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 400, behavior: "instant" });
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Edit article" }));
  expect((screen.getByRole("textbox", { name: "Article" }) as HTMLTextAreaElement).value).toContain("## My heading");
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole("status", { name: "Publication save status" }).textContent).toContain("Saved."));
  expect(screen.getByRole("region", { name: "Article writing workspace" })).toBeTruthy();
});

it("formats the remembered selection and restores it after article preview", async () => {
  render(<CmsProvider><PublicationEditor id="new" /></CmsProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Write article" }));
  const editor = screen.getByRole("textbox", { name: "Article" }) as HTMLTextAreaElement;
  fireEvent.change(editor, { target: { value: "Hello world" } });
  editor.setSelectionRange(6, 11); fireEvent.select(editor);
  fireEvent.click(screen.getByRole("button", { name: "Bold" }));
  expect(editor.value).toBe("Hello **world**");
  expect(editor.value.slice(editor.selectionStart, editor.selectionEnd)).toBe("world");
  vi.stubGlobal("scrollY", 250);
  fireEvent.click(screen.getByRole("tab", { name: "Preview" }));
  expect(screen.queryByRole("textbox", { name: "Article" })).toBeNull();
  expect(screen.getByRole("region", { name: "Article preview" }).textContent).toContain("Hello world");
  fireEvent.click(screen.getByRole("tab", { name: "Write" }));
  expect(screen.getByRole("textbox", { name: "Article" })).toBe(editor);
  expect(editor.value.slice(editor.selectionStart, editor.selectionEnd)).toBe("world");
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 250, behavior: "instant" });
});

it("inserts a validated link at the selection and cancels insertion without changing content", async () => {
  render(<CmsProvider><PublicationEditor id="new" /></CmsProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Write article" }));
  const editor = screen.getByRole("textbox", { name: "Article" }) as HTMLTextAreaElement;
  fireEvent.change(editor, { target: { value: "Read guide" } });
  editor.setSelectionRange(5, 10); fireEvent.select(editor);
  fireEvent.click(screen.getByRole("button", { name: "Insert link" }));
  const dialog = await screen.findByRole("dialog", { name: "Insert link" });
  expect((within(dialog).getByRole("textbox", { name: "Link text" }) as HTMLInputElement).value).toBe("guide");
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Link destination" }), { target: { value: "javascript:alert(1)" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Insert link" }));
  expect(editor.value).toBe("Read guide");
  expect(within(dialog).getByText("Enter a complete HTTPS destination.")).toBeTruthy();
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Link destination" }), { target: { value: "https://example.com" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Insert link" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(editor.value).toBe("Read [guide](<https://example.com>)");
  fireEvent.click(screen.getByRole("button", { name: "Insert code block" }));
  fireEvent.click(within(await screen.findByRole("dialog", { name: "Insert code block" })).getByRole("button", { name: "Cancel" }));
  expect(editor.value).toBe("Read [guide](<https://example.com>)");
});

it("opens the file picker directly and selects the image description for inline editing", async () => {
  const request = vi.fn(async () => {});
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: vi.fn(async () => {}) });
  try {
    render(<CmsProvider request={request}><PublicationEditor id="new" /></CmsProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Write article" }));
    const input = screen.getByLabelText("Article image");
    const openPicker = vi.spyOn(input, "click");
    fireEvent.click(screen.getByRole("button", { name: "Insert image" }));
    expect(openPicker).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.change(input, { target: { files: [new File(["pixels"], "chart.png", { type: "image/png" })] } });
    await screen.findByText("chart.png selected.");
    const editor = screen.getByRole("textbox", { name: "Article" }) as HTMLTextAreaElement;
    expect(editor.value).toContain("![Image description](<data:image/png;base64,");
    expect(editor.value.slice(editor.selectionStart, editor.selectionEnd)).toBe("Image description");
    fireEvent.change(editor, { target: { value: editor.value.replace("Image description", "A chart") } });
    fireEvent.click(screen.getByRole("tab", { name: "Preview" }));
    expect(screen.getByRole("img", { name: "A chart" }).getAttribute("src")).toMatch(/^data:image\/png;base64,/);
    expect(request).not.toHaveBeenCalled();
  } finally { Reflect.deleteProperty(HTMLImageElement.prototype, "decode"); }
});

it("inserts a code block with a language without requiring a publication save", async () => {
  const request = vi.fn(async () => {});
  render(<CmsProvider request={request}><PublicationEditor id="new" /></CmsProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Write article" }));
  fireEvent.click(screen.getByRole("button", { name: "Insert code block" }));
  const dialog = await screen.findByRole("dialog", { name: "Insert code block" });
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Code" }), { target: { value: "const answer = 42;" } });
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Language (optional)" }), { target: { value: "ts" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Insert code block" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect((screen.getByRole("textbox", { name: "Article" }) as HTMLTextAreaElement).value).toBe("```ts\nconst answer = 42;\n```");
  fireEvent.click(screen.getByRole("tab", { name: "Preview" }));
  expect(screen.getByText("const answer = 42;").closest("pre")).toBeTruthy();
  expect(request).not.toHaveBeenCalled();
});

it("closes insertion dialogs before Escape can leave the writing workspace", async () => {
  render(<CmsProvider><PublicationEditor id="new" /></CmsProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Write article" }));
  fireEvent.click(screen.getByRole("button", { name: "Insert link" }));
  const dialog = await screen.findByRole("dialog", { name: "Insert link" });
  fireEvent.keyDown(dialog, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByRole("region", { name: "Article writing workspace" })).toBeTruthy();
  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.queryByRole("region", { name: "Article writing workspace" })).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Write article" }));
});

it("offers all heading levels in a popover and separate inline list commands", async () => {
  render(<CmsProvider><PublicationEditor id="new" /></CmsProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Write article" }));
  const editor = screen.getByRole("textbox", { name: "Article" }) as HTMLTextAreaElement;
  fireEvent.change(editor, { target: { value: "Selected title" } });
  editor.setSelectionRange(0, 14); fireEvent.select(editor);
  fireEvent.click(screen.getByRole("button", { name: "Headings" }));
  const headings = await screen.findByRole("dialog", { name: "Heading level" });
  expect(within(headings).getAllByRole("button").map((button) => button.getAttribute("aria-label")))
    .toEqual(["Heading 1", "Heading 2", "Heading 3", "Heading 4", "Heading 5", "Heading 6"]);
  fireEvent.click(within(headings).getByRole("button", { name: "Heading 1" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Heading level" })).toBeNull());
  await waitFor(() => expect(editor.value).toBe("# Selected title"));
  await waitFor(() => expect(document.activeElement).toBe(editor));
  fireEvent.change(editor, { target: { value: "one\ntwo" } });
  editor.setSelectionRange(0, 7); fireEvent.select(editor);
  fireEvent.click(screen.getByRole("button", { name: "Bulleted list" }));
  expect(editor.value).toBe("- one\n- two");
  fireEvent.click(screen.getByRole("button", { name: "Numbered list" }));
  expect(editor.value).toBe("1. one\n2. two");
});

it("provides formatting tooltips on keyboard focus and semantic writing tabs", async () => {
  render(<CmsProvider><PublicationEditor id="new" /></CmsProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Write article" }));
  const lists = screen.getByRole("button", { name: "Bulleted list" });
  fireEvent.keyDown(document, { key: "Tab" });
  act(() => lists.focus());
  expect(await screen.findByRole("tooltip", { name: "Bulleted list" })).toBeTruthy();
  act(() => lists.blur());
  expect(screen.getByRole("tablist", { name: "Article view" })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Write" }).getAttribute("aria-selected")).toBe("true");
  fireEvent.click(screen.getByRole("tab", { name: "Preview" }));
  expect(screen.getByRole("tab", { name: "Preview" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByRole("tabpanel", { name: "Preview" })).toBeTruthy();
  expect(screen.queryByRole("group", { name: "Article formatting" })).toBeNull();
});

it("preserves edits typed while an article image is being decoded", async () => {
  let finish!: () => void;
  const decode = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: decode });
  try {
    render(<CmsProvider><PublicationEditor id="new" /></CmsProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Write article" }));
    const editor = screen.getByRole("textbox", { name: "Article" }) as HTMLTextAreaElement;
    fireEvent.click(screen.getByRole("button", { name: "Insert image" }));
    const input = screen.getByLabelText("Article image");
    fireEvent.change(input, { target: { files: [new File(["pixels"], "chart.png", { type: "image/png" })] } });
    await waitFor(() => expect(decode).toHaveBeenCalledTimes(1));
    fireEvent.change(editor, { target: { value: "Newer text" } });
    editor.setSelectionRange(10, 10); fireEvent.select(editor);
    await act(async () => finish());
    await screen.findByText("chart.png selected.");
    expect(editor.value).toMatch(/^Newer text\n\n!\[Image description\]/);
    expect(editor.value.slice(editor.selectionStart, editor.selectionEnd)).toBe("Image description");
  } finally { Reflect.deleteProperty(HTMLImageElement.prototype, "decode"); }
});
