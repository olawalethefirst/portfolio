import { CmsShell } from "./CmsShell";
import type { ReactNode } from "react";
import { ApiRequestError } from "@/src/api/client";
import { CmsProvider } from "@/src/cms/CmsProvider";
import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";
import { publicationApi } from "@/src/cms/publication-api";
import { usePublicationsQuery } from "@/src/cms/publication-queries";
import { initialPublications } from "@/src/cms/publication-fixtures";
import { mockPublicationApi } from "@/src/cms/test-support/mockPublicationApi";
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

/**
 * The outer existence check reads usePublicationsQuery; every test here still
 * exercises the inner form through CmsProvider's demo array, so the query mock
 * only needs to agree on which IDs exist, not field-level content.
 */
async function render(ui: ReactNode) {
  const result = renderPage(
    <CmsQueryProvider accountId="owner">{ui}</CmsQueryProvider>,
    { wrapper: CmsShell },
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("status", { name: "Loading publication" }),
    ).toBeNull(),
  );
  return result;
}

const { push, uploadImage } = vi.hoisted(() => ({
  push: vi.fn(),
  uploadImage: vi.fn(),
}));
vi.mock("@/src/media/upload-client", () => ({ uploadImage }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/admin/publications",
}));

const uploadedCover = {
  source:
    "https://example.supabase.co/storage/v1/object/public/media/cover.png",
  descriptor: {
    assetId: "12345678-1234-4234-8234-123456789abc",
    bucket: "media",
    path: "12345678-1234-4234-8234-123456789abc.png",
  },
};

beforeEach(() => {
  push.mockReset();
  uploadImage.mockReset().mockResolvedValue(uploadedCover);
  mockPublicationApi(async () => {}, initialPublications());
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

const createdPublicationPattern = /^\/admin\/publications\/[0-9a-f-]{36}$/;

function PublishedReader({ id }: { id: string }) {
  const { data } = usePublicationsQuery();
  const record = data?.find((item) => item.id === id);
  return (
    <output aria-label="Demo published title">
      {record?.published?.title ?? "Unpublished"}
    </output>
  );
}

it.each(["", "Recovered article text"])(
  "restores a legacy external draft as an editable internal article: %s",
  async (bodyMarkdown) => {
    const record = initialPublications()[0];
    localStorage.setItem(
      "portfolio:cms-drafts:v1:publications:publication-1",
      JSON.stringify({
        id: record.id,
        value: {
          ...record.draft,
          title: "Recovered title",
          bodyMarkdown,
          kind: "external",
          externalUrl: "https://example.com/old",
        },
      }),
    );
    await render(
      <CmsProvider>
        <PublicationEditor id={record.id} />
      </CmsProvider>,
    );
    expect(
      (screen.getByRole("textbox", { name: "Title" }) as HTMLInputElement)
        .value,
    ).toBe("Recovered title");
    expect(
      screen.queryByRole("radiogroup", { name: "Publication type" }),
    ).toBeNull();
    expect(
      screen.queryByRole("textbox", { name: "Publication URL" }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: bodyMarkdown ? "Edit article" : "Write article",
      }),
    );
    expect(
      (screen.getByRole("textbox", { name: "Article" }) as HTMLTextAreaElement)
        .value,
    ).toBe(bodyMarkdown);
  },
);

it("reports a Publication absent from the server as unavailable", async () => {
  vi.spyOn(publicationApi, "list").mockResolvedValue([]);
  renderPage(
    <CmsQueryProvider accountId="owner">
      <PublicationEditor id="missing" />
    </CmsQueryProvider>,
    { wrapper: CmsShell },
  );
  expect(
    await screen.findByRole("heading", { name: "Publication unavailable" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Back to publications" }));
  expect(push).toHaveBeenCalledWith("/admin/publications");
});

it("shows loading, then offers a retry when the Publication list cannot be read", async () => {
  const list = vi
    .spyOn(publicationApi, "list")
    .mockRejectedValueOnce(new ApiRequestError("network", null));
  renderPage(
    <CmsQueryProvider accountId="owner">
      <CmsProvider>
        <PublicationEditor id="publication-1" />
      </CmsProvider>
    </CmsQueryProvider>,
    { wrapper: CmsShell },
  );
  expect(
    await screen.findByRole("status", { name: "Loading publication" }),
  ).toBeTruthy();
  await screen.findByRole("heading", {
    name: "Couldn’t load this publication",
  });
  list.mockResolvedValue(initialPublications());
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("textbox", { name: "Title" })).toBeTruthy();
});

describe("publication CMS", () => {
  it("previews unsaved content with the public article and returns without publishing or losing edits", async () => {
    await render(
      <CmsProvider>
        <PublicationEditor id="publication-1" />
        <PublishedReader id="publication-1" />
      </CmsProvider>,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "My unsaved story" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview card" }));
    expect(
      await screen.findByRole("article", { name: "My unsaved story" }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Exit publication preview" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Exit publication preview" }),
    );
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Preview card" }),
    );
    vi.stubGlobal("scrollY", 420);
    fireEvent.click(screen.getByRole("button", { name: "Preview article" }));
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
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Preview article" }),
    );
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 420,
      behavior: "instant",
    });
    expect(
      (
        (await screen.findByRole("textbox", {
          name: "Title",
        })) as HTMLInputElement
      ).value,
    ).toBe("My unsaved story");
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
  });

  it("locks fields while saving and keeps the published copy unchanged", async () => {
    let finish: () => void = () => {
      throw new Error("Request has not started");
    };
    const request = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    mockPublicationApi(request, initialPublications());
    await render(
      <CmsProvider>
        <PublicationEditor id="publication-1" />
        <PublishedReader id="publication-1" />
      </CmsProvider>,
    );
    const title = screen.getByRole("textbox", { name: "Title" });
    fireEvent.change(title, { target: { value: "Submitted draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(
      [
        ...title.closest("form")!.querySelectorAll("input, textarea, button"),
      ].every((control) => control.matches(":disabled")),
    ).toBe(true);
    expect(
      screen
        .getByRole("button", { name: "Preview article" })
        .matches(":disabled"),
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(request).toHaveBeenCalled());
    await act(async () => finish());
    expect(title.matches(":disabled")).toBe(false);
    fireEvent.change(title, { target: { value: "Still typing" } });
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
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error("Save failed. Try again."))
      .mockResolvedValue(undefined);
    mockPublicationApi(request, initialPublications());
    await render(
      <CmsProvider>
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
    mockPublicationApi(request, initialPublications());
    await render(
      <CmsProvider>
        <PublicationEditor id="new" />
      </CmsProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        expect.stringMatching(createdPublicationPattern),
      ),
    );
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
    fireEvent.click(screen.getByRole("button", { name: "Preview article" }));
    expect(
      await screen.findByRole("heading", { name: "Untitled publication" }),
    ).toBeTruthy();
    expect(screen.getByText(/Preview placeholders/)).toBeTruthy();
  });

  it("previews publication cards with internal article destinations", async () => {
    await render(
      <CmsProvider>
        <PublicationEditor id="publication-2" />
      </CmsProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Preview card" }));
    expect(
      screen.queryByRole("navigation", { name: "Article sections" }),
    ).toBeNull();
    expect(
      screen
        .getByRole("link", {
          name: "Read Designing with productive constraints",
        })
        .getAttribute("href"),
    ).toBe("/publication-details-lab");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("publishes the working copy and confirms withdrawal without deleting content", async () => {
    await render(
      <CmsProvider>
        <PublicationEditor id="publication-1" />
        <PublishedReader id="publication-1" />
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
    fireEvent.click(within(dialog).getByRole("button", { name: "Unpublish" }));
    await screen.findByText("Unpublished. Your draft is still available.");
    expect(screen.getByLabelText("Demo published title").textContent).toBe(
      "Unpublished",
    );
    expect(
      (screen.getByRole("textbox", { name: "Title" }) as HTMLInputElement)
        .value,
    ).toBe("Ready for readers");
  });
});

it("uploads a selected cover and keeps it through full-screen card preview and return to editing", async () => {
  await render(
    <CmsProvider>
      <PublicationEditor id="publication-1" />
    </CmsProvider>,
  );
  fireEvent.change(screen.getByLabelText("Replace image"), {
    target: {
      files: [new File(["image"], "selected.png", { type: "image/png" })],
    },
  });
  await waitFor(() =>
    expect(
      screen.getByRole("img", { name: initialPublications()[0].draft.coverAlt })
        .getAttribute("src"),
    ).toBe(uploadedCover.source),
  );
  fireEvent.click(screen.getByRole("button", { name: "Preview card" }));
  await waitFor(() =>
    expect(
      screen
        .getByRole("img", { name: initialPublications()[0].draft.coverAlt })
        .getAttribute("src"),
    ).toContain(encodeURIComponent(uploadedCover.source)),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Exit publication preview" }),
  );
  await screen.findByLabelText("Replace image");
  expect(
    screen.getByRole("img", { name: initialPublications()[0].draft.coverAlt })
      .getAttribute("src"),
  ).toBe(uploadedCover.source);
  fireEvent.click(screen.getByRole("button", { name: "Remove image" }));
  expect(await screen.findByText("No image selected")).toBeTruthy();
});

it("deduplicates removable tags and preserves article content when reopening the writer", async () => {
  await render(
    <CmsProvider>
      <PublicationEditor id="publication-1" />
    </CmsProvider>,
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Tags" }), {
    target: { value: "React, react, Writing" },
  });
  expect(
    screen.getAllByRole("button", { name: "Remove tag React" }),
  ).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Remove tag React" }));
  expect(
    (screen.getByRole("textbox", { name: "Tags" }) as HTMLInputElement).value,
  ).toBe("Writing");
  fireEvent.click(screen.getByRole("button", { name: "Edit article" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Article" }), {
    target: { value: "Keep my article" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Back to publication" }));
  fireEvent.click(screen.getByRole("button", { name: "Edit article" }));
  expect(
    (screen.getByRole("textbox", { name: "Article" }) as HTMLTextAreaElement)
      .value,
  ).toBe("Keep my article");
  fireEvent.click(screen.getByRole("button", { name: "Back to publication" }));
  expect(
    screen.queryByRole("radiogroup", { name: "Publication type" }),
  ).toBeNull();
  expect(screen.queryByRole("textbox", { name: "Publication URL" })).toBeNull();
  expect(screen.getByText("Published · Unpublished changes")).toBeTruthy();
  const description = screen.getByRole("textbox", {
    name: "Image description",
  }) as HTMLInputElement;
  const originalAlt = description.value;
  expect(
    screen.queryByRole("checkbox", { name: "Decorative image" }),
  ).toBeNull();
  expect(
    (
      screen.getByRole("textbox", {
        name: "Image description",
      }) as HTMLInputElement
    ).value,
  ).toBe(originalAlt);
});

it("discards to the last saved publication draft for publication-1 without publishing", async () => {
  const request = vi.fn(async () => {});
  mockPublicationApi(request, initialPublications());
  await render(
    <CmsProvider>
      <PublicationEditor id="publication-1" />
      <PublishedReader id="publication-1" />
    </CmsProvider>,
  );
  const title = screen.getByRole("textbox", {
    name: "Title",
  }) as HTMLInputElement;
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
  fireEvent.click(screen.getByRole("button", { name: "Update published" }));
  await screen.findByText("Add a title before publishing.");
  fireEvent.click(discard);
  expect(title.value).toBe("Saved draft only");
  expect(screen.queryByText("Add a title before publishing.")).toBeNull();
  expect(
    screen.getByRole("status", { name: "Publication save status" }).textContent,
  ).toContain("No unsaved changes");
  expect(screen.getByLabelText("Demo published title").textContent).toBe(
    published,
  );
  expect(request).toHaveBeenCalledTimes(1);
});

it("discards an unsaved new publication draft before any Save, without publishing", async () => {
  const request = vi.fn(async () => {});
  mockPublicationApi(request, initialPublications());
  await render(
    <CmsProvider>
      <PublicationEditor id="new" />
    </CmsProvider>,
  );
  const title = screen.getByRole("textbox", {
    name: "Title",
  }) as HTMLInputElement;
  const discard = screen.getByRole("button", { name: "Discard changes" });
  expect(discard.hasAttribute("disabled")).toBe(true);
  fireEvent.change(title, { target: { value: "Temporary edit" } });
  fireEvent.click(discard);
  expect(title.value).toBe("");
  expect(request).not.toHaveBeenCalled();
});

it("confirms editor deletion, preserves unsaved edits on cancel/failure, and blocks duplicate pending requests", async () => {
  let finish!: () => void;
  const request = vi
    .fn()
    .mockRejectedValueOnce(new Error("Deletion failed. Try again."))
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
  const record = initialPublications()[0];
  mockPublicationApi(request, [record]);
  await render(
    <CmsProvider>
      <PublicationEditor id={record.id} />
      <PublishedReader id={record.id} />
    </CmsProvider>,
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
    target: { value: "Unsaved delete title" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Delete publication" }));
  const confirmation = await screen.findByRole("dialog", {
    name: "Delete this publication?",
  });
  expect(within(confirmation).getByText(/Unsaved delete title/)).toBeTruthy();
  fireEvent.click(within(confirmation).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(request).not.toHaveBeenCalled();
  expect(
    (screen.getByRole("textbox", { name: "Title" }) as HTMLInputElement).value,
  ).toBe("Unsaved delete title");
  fireEvent.click(screen.getByRole("button", { name: "Delete publication" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  const retryDialog = await screen.findByRole("dialog", {
    name: "Delete this publication?",
  });
  expect(await within(retryDialog).findByRole("alert")).toBeTruthy();
  expect(screen.getByLabelText("Demo published title").textContent).toBe(
    record.draft.title,
  );
  expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe(
    "Unsaved delete title",
  );
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(within(retryDialog).getByRole("button", { name: "Delete" }));
  fireEvent.click(within(retryDialog).getByRole("button", { name: "Delete" }));
  fireEvent.click(within(retryDialog).getByRole("button", { name: "Cancel" }));
  fireEvent.keyDown(retryDialog, { key: "Escape" });
  expect(
    screen.getByRole("dialog", { name: "Delete this publication?" }),
  ).toBeTruthy();
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  await act(async () => finish());
  await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/publications"));
  expect(screen.getByLabelText("Demo published title").textContent).toBe(
    "Unpublished",
  );
});

it("offers no deletion before any save and redirects to the created Publication on first save", async () => {
  await render(
    <CmsProvider>
      <PublicationEditor id="new" />
    </CmsProvider>,
  );
  expect(
    screen.queryByRole("button", { name: "Delete publication" }),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() =>
    expect(push).toHaveBeenCalledWith(
      expect.stringMatching(createdPublicationPattern),
    ),
  );
});

it("keeps the unpublish confirmation open while the request is pending", async () => {
  let finish!: () => void;
  const request = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  mockPublicationApi(request, initialPublications());
  await render(
    <CmsProvider>
      <PublicationEditor id="publication-1" />
      <PublishedReader id="publication-1" />
    </CmsProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Unpublish" }));
  const dialog = await screen.findByRole("dialog", {
    name: "Unpublish this publication?",
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "Unpublish" }));
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  expect(
    screen.getByRole("dialog", { name: "Unpublish this publication?" }),
  ).toBe(dialog);
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  await act(async () => finish());
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByLabelText("Demo published title").textContent).toBe(
    "Unpublished",
  );
});

it("implicitly saves incomplete over-limit drafts without publishing", async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  mockPublicationApi(request, initialPublications());
  await render(
    <CmsProvider>
      <PublicationEditor id="new" />
    </CmsProvider>,
  );
  const title = screen.getByRole("textbox", { name: "Title" });
  fireEvent.change(title, { target: { value: "a".repeat(41) } });
  const form = title.closest("form");
  expect(form).toBeTruthy();
  expect(form!.noValidate).toBe(true);
  fireEvent.submit(form!);
  await waitFor(() =>
    expect(push).toHaveBeenCalledWith(
      expect.stringMatching(createdPublicationPattern),
    ),
  );
  expect(request).toHaveBeenCalledTimes(1);
});

it("corrects title and parsed tag errors live without blocking draft saves", async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  mockPublicationApi(request, initialPublications());
  await render(
    <CmsProvider>
      <PublicationEditor id="new" />
    </CmsProvider>,
  );
  const title = screen.getByRole("textbox", { name: "Title" });
  fireEvent.change(title, { target: { value: "a".repeat(41) } });
  expect(title.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.focus(title);
  fireEvent.blur(title);
  expect(title.getAttribute("aria-invalid")).toBe("true");
  fireEvent.change(title, { target: { value: "Corrected" } });
  expect(title.getAttribute("aria-invalid")).not.toBe("true");
  const tags = screen.getByRole("textbox", { name: "Tags" });
  fireEvent.change(tags, { target: { value: "one,two,three,four" } });
  fireEvent.focus(tags);
  fireEvent.blur(tags);
  expect(tags.getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByText("Use 3 tags or fewer.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Remove tag four" }));
  expect(tags.getAttribute("aria-invalid")).not.toBe("true");
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() =>
    expect(push).toHaveBeenCalledWith(
      expect.stringMatching(createdPublicationPattern),
    ),
  );
  expect(request).toHaveBeenCalledTimes(1);
});

it("clears the required article error after writing content following an incomplete Publish", async () => {
  await render(
    <CmsProvider>
      <PublicationEditor id="new" />
    </CmsProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  expect(
    screen
      .getByRole("button", { name: "Write article" })
      .getAttribute("aria-describedby"),
  ).toBe("publication-body-error");
  expect(
    screen.getByText("Write your article before publishing."),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Write article" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Article" }), {
    target: { value: "My internal article" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Back to publication" }));
  expect(
    screen.queryByText("Write your article before publishing."),
  ).toBeNull();
  expect(screen.getByRole("button", { name: "Edit article" })).toBeTruthy();
});

it("focuses tags before cover and requires an image description", async () => {
  await render(
    <CmsProvider>
      <PublicationEditor id="publication-1" />
    </CmsProvider>,
  );
  const tags = screen.getByRole("textbox", { name: "Tags" });
  fireEvent.change(tags, { target: { value: "a".repeat(17) } });
  fireEvent.click(screen.getByRole("button", { name: "Remove image" }));
  fireEvent.click(screen.getByRole("button", { name: "Update published" }));
  await waitFor(() => expect(document.activeElement).toBe(tags));
  fireEvent.change(tags, { target: { value: "Valid" } });
  fireEvent.click(screen.getByRole("button", { name: "Update published" }));
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByLabelText("Choose image")),
  );
  const alt = screen.getByRole("textbox", { name: "Image description" });
  fireEvent.change(alt, { target: { value: "" } });
  fireEvent.focus(alt);
  fireEvent.blur(alt);
  expect(alt.getAttribute("aria-invalid")).toBe("true");
  expect(
    screen.queryByRole("checkbox", { name: "Decorative image" }),
  ).toBeNull();
});

it("discards failed cover feedback even when the saved content did not change", async () => {
  uploadImage.mockRejectedValueOnce(
    new Error("Choose a JPEG, PNG or WebP image."),
  );
  await render(
    <CmsProvider>
      <PublicationEditor id="publication-1" />
    </CmsProvider>,
  );
  fireEvent.change(screen.getByLabelText("Replace image"), {
    target: { files: [new File(["bad"], "bad.txt", { type: "text/plain" })] },
  });
  expect((await screen.findByRole("alert")).textContent).toContain(
    "JPEG, PNG or WebP",
  );
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByLabelText("Replace image")).toBeTruthy();
});

it("unlocks fields after save failure and permits correction and retry", async () => {
  let fail!: (reason: Error) => void;
  const request = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          fail = reject;
        }),
    )
    .mockResolvedValue(undefined);
  mockPublicationApi(request, initialPublications());
  await render(
    <CmsProvider>
      <PublicationEditor id="new" />
    </CmsProvider>,
  );
  const title = screen.getByRole("textbox", { name: "Title" });
  fireEvent.change(title, { target: { value: "Submitted" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(title.matches(":disabled")).toBe(true);
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  await act(async () => fail(new Error("Save failure")));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(title.matches(":disabled")).toBe(false);
  fireEvent.change(title, { target: { value: "Newer" } });
  expect(screen.queryByRole("alert")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() =>
    expect(push).toHaveBeenCalledWith(
      expect.stringMatching(createdPublicationPattern),
    ),
  );
});

it("writes before the first save and returns to the form with edits, focus and scroll intact", async () => {
  const request = vi.fn(async () => {});
  mockPublicationApi(request, initialPublications());
  await render(
    <CmsProvider>
      <PublicationEditor id="new" />
    </CmsProvider>,
  );
  expect(screen.queryByRole("textbox", { name: "Article" })).toBeNull();
  vi.stubGlobal("scrollY", 400);
  fireEvent.click(screen.getByRole("button", { name: "Write article" }));
  expect(
    screen.getByRole("region", { name: "Article writing workspace" }),
  ).toBeTruthy();
  expect(
    screen.queryByRole("navigation", { name: "Content navigation" }),
  ).toBeNull();
  expect(screen.queryByRole("button", { name: "Publish" })).toBeNull();
  fireEvent.change(screen.getByRole("textbox", { name: "Article" }), {
    target: { value: "## My heading\n\nA **clear** story." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Back to publication" }));
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Edit article" }),
  );
  expect(window.scrollTo).toHaveBeenLastCalledWith({
    top: 400,
    behavior: "instant",
  });
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Edit article" }));
  expect(
    (screen.getByRole("textbox", { name: "Article" }) as HTMLTextAreaElement)
      .value,
  ).toContain("## My heading");
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(push).toHaveBeenCalledWith(
      expect.stringMatching(createdPublicationPattern),
    ),
  );
  expect(
    screen.getByRole("region", { name: "Article writing workspace" }),
  ).toBeTruthy();
});

it("formats the remembered selection and restores it after article preview", async () => {
  await render(
    <CmsProvider>
      <PublicationEditor id="new" />
    </CmsProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Write article" }));
  const editor = screen.getByRole("textbox", {
    name: "Article",
  }) as HTMLTextAreaElement;
  fireEvent.change(editor, { target: { value: "Hello world" } });
  editor.setSelectionRange(6, 11);
  fireEvent.select(editor);
  fireEvent.click(screen.getByRole("button", { name: "Bold" }));
  expect(editor.value).toBe("Hello **world**");
  expect(editor.value.slice(editor.selectionStart, editor.selectionEnd)).toBe(
    "world",
  );
  vi.stubGlobal("scrollY", 250);
  fireEvent.click(screen.getByRole("tab", { name: "Preview" }));
  expect(screen.queryByRole("textbox", { name: "Article" })).toBeNull();
  expect(
    screen.getByRole("region", { name: "Article preview" }).textContent,
  ).toContain("Hello world");
  fireEvent.click(screen.getByRole("tab", { name: "Write" }));
  expect(screen.getByRole("textbox", { name: "Article" })).toBe(editor);
  expect(editor.value.slice(editor.selectionStart, editor.selectionEnd)).toBe(
    "world",
  );
  expect(window.scrollTo).toHaveBeenLastCalledWith({
    top: 250,
    behavior: "instant",
  });
});

it("inserts a validated link at the selection and cancels insertion without changing content", async () => {
  await render(
    <CmsProvider>
      <PublicationEditor id="new" />
    </CmsProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Write article" }));
  const editor = screen.getByRole("textbox", {
    name: "Article",
  }) as HTMLTextAreaElement;
  fireEvent.change(editor, { target: { value: "Read guide" } });
  editor.setSelectionRange(5, 10);
  fireEvent.select(editor);
  fireEvent.click(screen.getByRole("button", { name: "Insert link" }));
  const dialog = await screen.findByRole("dialog", { name: "Insert link" });
  expect(
    (
      within(dialog).getByRole("textbox", {
        name: "Link text",
      }) as HTMLInputElement
    ).value,
  ).toBe("guide");
  fireEvent.change(
    within(dialog).getByRole("textbox", { name: "Link destination" }),
    { target: { value: "javascript:alert(1)" } },
  );
  fireEvent.click(within(dialog).getByRole("button", { name: "Insert link" }));
  expect(editor.value).toBe("Read guide");
  expect(
    within(dialog).getByText("Enter a complete HTTPS destination."),
  ).toBeTruthy();
  fireEvent.change(
    within(dialog).getByRole("textbox", { name: "Link destination" }),
    { target: { value: "https://example.com" } },
  );
  fireEvent.click(within(dialog).getByRole("button", { name: "Insert link" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(editor.value).toBe("Read [guide](<https://example.com>)");
  fireEvent.click(screen.getByRole("button", { name: "Insert code block" }));
  fireEvent.click(
    within(
      await screen.findByRole("dialog", { name: "Insert code block" }),
    ).getByRole("button", { name: "Cancel" }),
  );
  expect(editor.value).toBe("Read [guide](<https://example.com>)");
});

it("opens the file picker directly and inserts the uploaded image description for inline editing", async () => {
  const request = vi.fn(async () => {});
  mockPublicationApi(request, initialPublications());
  await render(
    <CmsProvider>
      <PublicationEditor id="new" />
    </CmsProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Write article" }));
  const input = screen.getByLabelText("Article image");
  const openPicker = vi.spyOn(input, "click");
  fireEvent.click(screen.getByRole("button", { name: "Insert image" }));
  expect(openPicker).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.change(input, {
    target: {
      files: [new File(["pixels"], "chart.png", { type: "image/png" })],
    },
  });
  await waitFor(() => expect(uploadImage).toHaveBeenCalledTimes(1));
  const editor = screen.getByRole("textbox", {
    name: "Article",
  }) as HTMLTextAreaElement;
  await waitFor(() =>
    expect(editor.value).toContain(
      `![Image description](<${uploadedCover.source}>)`,
    ),
  );
  expect(editor.value.slice(editor.selectionStart, editor.selectionEnd)).toBe(
    "Image description",
  );
  fireEvent.change(editor, {
    target: { value: editor.value.replace("Image description", "A chart") },
  });
  fireEvent.click(screen.getByRole("tab", { name: "Preview" }));
  expect(
    screen.getByRole("img", { name: "A chart" }).getAttribute("src"),
  ).toBe(uploadedCover.source);
  expect(request).not.toHaveBeenCalled();
});

it("inserts a code block with a language without requiring a publication save", async () => {
  const request = vi.fn(async () => {});
  mockPublicationApi(request, initialPublications());
  await render(
    <CmsProvider>
      <PublicationEditor id="new" />
    </CmsProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Write article" }));
  fireEvent.click(screen.getByRole("button", { name: "Insert code block" }));
  const dialog = await screen.findByRole("dialog", {
    name: "Insert code block",
  });
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Code" }), {
    target: { value: "const answer = 42;" },
  });
  fireEvent.change(
    within(dialog).getByRole("textbox", { name: "Language (optional)" }),
    { target: { value: "ts" } },
  );
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Insert code block" }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(
    (screen.getByRole("textbox", { name: "Article" }) as HTMLTextAreaElement)
      .value,
  ).toBe("```ts\nconst answer = 42;\n```");
  fireEvent.click(screen.getByRole("tab", { name: "Preview" }));
  expect(screen.getByText("const answer = 42;").closest("pre")).toBeTruthy();
  expect(request).not.toHaveBeenCalled();
});

it("closes insertion dialogs before Escape can leave the writing workspace", async () => {
  await render(
    <CmsProvider>
      <PublicationEditor id="new" />
    </CmsProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Write article" }));
  fireEvent.click(screen.getByRole("button", { name: "Insert link" }));
  const dialog = await screen.findByRole("dialog", { name: "Insert link" });
  fireEvent.keyDown(dialog, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(
    screen.getByRole("region", { name: "Article writing workspace" }),
  ).toBeTruthy();
  fireEvent.keyDown(window, { key: "Escape" });
  expect(
    screen.queryByRole("region", { name: "Article writing workspace" }),
  ).toBeNull();
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Write article" }),
  );
});

it("offers all heading levels in a popover and separate inline list commands", async () => {
  await render(
    <CmsProvider>
      <PublicationEditor id="new" />
    </CmsProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Write article" }));
  const editor = screen.getByRole("textbox", {
    name: "Article",
  }) as HTMLTextAreaElement;
  fireEvent.change(editor, { target: { value: "Selected title" } });
  editor.setSelectionRange(0, 14);
  fireEvent.select(editor);
  fireEvent.click(screen.getByRole("button", { name: "Headings" }));
  const headings = await screen.findByRole("dialog", { name: "Heading level" });
  expect(
    within(headings)
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label")),
  ).toEqual([
    "Heading 1",
    "Heading 2",
    "Heading 3",
    "Heading 4",
    "Heading 5",
    "Heading 6",
  ]);
  fireEvent.click(within(headings).getByRole("button", { name: "Heading 1" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog", { name: "Heading level" })).toBeNull(),
  );
  await waitFor(() => expect(editor.value).toBe("# Selected title"));
  await waitFor(() => expect(document.activeElement).toBe(editor));
  fireEvent.change(editor, { target: { value: "one\ntwo" } });
  editor.setSelectionRange(0, 7);
  fireEvent.select(editor);
  fireEvent.click(screen.getByRole("button", { name: "Bulleted list" }));
  expect(editor.value).toBe("- one\n- two");
  fireEvent.click(screen.getByRole("button", { name: "Numbered list" }));
  expect(editor.value).toBe("1. one\n2. two");
});

it("provides formatting tooltips on keyboard focus and semantic writing tabs", async () => {
  await render(
    <CmsProvider>
      <PublicationEditor id="new" />
    </CmsProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Write article" }));
  const lists = screen.getByRole("button", { name: "Bulleted list" });
  fireEvent.keyDown(document, { key: "Tab" });
  act(() => lists.focus());
  expect(
    await screen.findByRole("tooltip", { name: "Bulleted list" }),
  ).toBeTruthy();
  act(() => lists.blur());
  expect(screen.getByRole("tablist", { name: "Article view" })).toBeTruthy();
  expect(
    screen.getByRole("tab", { name: "Write" }).getAttribute("aria-selected"),
  ).toBe("true");
  fireEvent.click(screen.getByRole("tab", { name: "Preview" }));
  expect(
    screen.getByRole("tab", { name: "Preview" }).getAttribute("aria-selected"),
  ).toBe("true");
  expect(screen.getByRole("tabpanel", { name: "Preview" })).toBeTruthy();
  expect(
    screen.queryByRole("group", { name: "Article formatting" }),
  ).toBeNull();
});

it("preserves edits typed while an article image is uploading", async () => {
  let finish!: (image: typeof uploadedCover) => void;
  uploadImage.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await render(
    <CmsProvider>
      <PublicationEditor id="new" />
    </CmsProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Write article" }));
  const editor = screen.getByRole("textbox", {
    name: "Article",
  }) as HTMLTextAreaElement;
  fireEvent.click(screen.getByRole("button", { name: "Insert image" }));
  const input = screen.getByLabelText("Article image");
  fireEvent.change(input, {
    target: {
      files: [new File(["pixels"], "chart.png", { type: "image/png" })],
    },
  });
  await waitFor(() => expect(uploadImage).toHaveBeenCalledTimes(1));
  fireEvent.change(editor, { target: { value: "Newer text" } });
  editor.setSelectionRange(10, 10);
  fireEvent.select(editor);
  await act(async () => finish(uploadedCover));
  await waitFor(() =>
    expect(editor.value).toMatch(/^Newer text\n\n!\[Image description\]/),
  );
  expect(editor.value.slice(editor.selectionStart, editor.selectionEnd)).toBe(
    "Image description",
  );
});

it("locks the writing textarea and formatting controls during save and restores them after failure", async () => {
  let fail!: (reason: Error) => void;
  const request = vi.fn(
    () =>
      new Promise<void>((_, reject) => {
        fail = reject;
      }),
  );
  mockPublicationApi(request, initialPublications());
  await render(
    <CmsProvider>
      <PublicationEditor id="new" />
    </CmsProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Write article/ }));
  const article = screen.getByRole("textbox", {
    name: "Article",
  }) as HTMLTextAreaElement;
  fireEvent.change(article, { target: { value: "Submitted article" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(article.matches(":disabled")).toBe(true);
  expect(
    screen.getByRole("button", { name: "Bold" }).matches(":disabled"),
  ).toBe(true);
  fireEvent.change(article, { target: { value: "Blocked edit" } });
  expect(article.value).toBe("Submitted article");
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  await act(async () => fail(new Error("Save failure")));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(article.matches(":disabled")).toBe(false);
  fireEvent.change(article, { target: { value: "Corrected article" } });
  expect(article.value).toBe("Corrected article");
});
