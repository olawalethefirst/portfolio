import { CmsProvider, useCms } from "@/src/cms/CmsProvider";
import { initialPublications } from "@/src/cms/publication-fixtures";
import {
act,
fireEvent,
render,
screen,
waitFor,
within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicationEditor } from "./PublicationEditor";
import { PublicationList } from "./PublicationList";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

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
    expect(screen.getByText("Saved.")).toBeTruthy();
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

  it("previews external publications as cards without inventing article content", async () => {
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
    expect(screen.getByRole("link", { name: "Read Designing with productive constraints" }).getAttribute("href")).toBe("https://example.com/publications/productive-constraints");
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

it("deduplicates removable tags and preserves hidden content when changing publication type", async () => {
  render(<CmsProvider><PublicationEditor id="publication-1" /></CmsProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Tags" }), { target: { value: "React, react, Writing" } });
  expect(screen.getAllByRole("button", { name: "Remove tag React" })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Remove tag React" }));
  expect((screen.getByRole("textbox", { name: "Tags" }) as HTMLInputElement).value).toBe("Writing");
  fireEvent.change(screen.getByRole("textbox", { name: "Article" }), { target: { value: "Keep my article" } });
  fireEvent.click(screen.getByRole("radio", { name: "External link" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Publication URL" }), { target: { value: "https://example.com/story" } });
  fireEvent.click(screen.getByRole("radio", { name: "Local article" }));
  expect((screen.getByRole("textbox", { name: "Article" }) as HTMLTextAreaElement).value).toBe("Keep my article");
  fireEvent.click(screen.getByRole("radio", { name: "External link" }));
  expect((screen.getByRole("textbox", { name: "Publication URL" }) as HTMLInputElement).value).toBe("https://example.com/story");
  expect(screen.getByText("Published · Unpublished changes")).toBeTruthy();
  const description = screen.getByRole("textbox", { name: "Image description" }) as HTMLInputElement;
  const originalAlt = description.value;
  fireEvent.click(screen.getByRole("checkbox", { name: "Decorative image" }));
  expect(screen.queryByRole("textbox", { name: "Image description" })).toBeNull();
  fireEvent.click(screen.getByRole("checkbox", { name: "Decorative image" }));
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
  expect(screen.getByRole("link", { name: `Read ${records[2].draft.title}` }).getAttribute("href")).toBe(records[2].draft.externalUrl);
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
