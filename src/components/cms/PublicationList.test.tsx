import type { ReactNode } from "react";
import {
  act,
  fireEvent,
  render as renderPage,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ApiRequestError } from "@/src/api/client";
import { CmsProvider } from "@/src/cms/CmsProvider";
import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";
import { publicationApi } from "@/src/cms/publication-api";
import { initialPublications } from "@/src/cms/publication-fixtures";
import type { PublicationRecord } from "@/src/cms/publications";
import { mockPublicationApi } from "@/src/cms/test-support/mockPublicationApi";
import { CmsShell } from "./CmsShell";
import { PublicationList } from "./PublicationList";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/admin/publications",
}));

function render(ui: ReactNode) {
  return renderPage(
    <CmsQueryProvider accountId="owner">
      <CmsProvider>{ui}</CmsProvider>
    </CmsQueryProvider>,
    { wrapper: CmsShell },
  );
}

/** First record keeps unpublished changes; second is draft only. */
function mixedRecords(): PublicationRecord[] {
  const records = initialPublications();
  records[0] = {
    ...records[0],
    draft: { ...records[0].draft, summary: "Draft revision" },
  };
  records[1] = { ...records[1], published: null };
  return records;
}

const names = () =>
  within(screen.getByRole("list"))
    .getAllByRole("heading")
    .map((heading) => heading.textContent);
const moveButton = (name: string) => screen.getByRole("button", { name });
const titles = () => initialPublications().map((record) => record.draft.title);

async function showList() {
  render(<PublicationList />);
  await screen.findByRole("heading", { name: titles()[0] });
}

async function chooseStatus(label: string) {
  fireEvent.click(screen.getByRole("button", { name: /Status/ }));
  fireEvent.click(await screen.findByRole("option", { name: label }));
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
}

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
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
  mockPublicationApi(async () => {}, initialPublications());
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(Element.prototype, "getAnimations");
});

it("lists the saved collection and distinguishes no search results", async () => {
  await showList();
  expect(screen.getByRole("heading", { name: titles()[1] })).toBeTruthy();
  fireEvent.change(
    screen.getByRole("searchbox", { name: "Search publications" }),
    { target: { value: "missing" } },
  );
  expect(
    screen.getByRole("heading", { name: "No matching publications" }),
  ).toBeTruthy();
});

it("reports loading before the collection arrives", async () => {
  vi.spyOn(publicationApi, "list").mockImplementation(
    () => new Promise(() => {}),
  );
  render(<PublicationList />);
  expect(
    await screen.findByRole("status", { name: "Loading publications" }),
  ).toBeTruthy();
});

it("offers a retry when the collection cannot be read", async () => {
  const list = vi
    .spyOn(publicationApi, "list")
    .mockRejectedValueOnce(new ApiRequestError("network", null));
  render(<PublicationList />);
  await screen.findByRole("heading", { name: "Couldn’t load publications" });
  expect(screen.getByRole("heading", { level: 1, name: "Publications" })).toBeTruthy();
  list.mockResolvedValue(initialPublications());
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(
    await screen.findByRole("heading", { name: titles()[0] }),
  ).toBeTruthy();
});

it("submits the complete order and keeps boundaries disabled", async () => {
  await showList();
  expect(moveButton(`Move ${titles()[0]} up`).hasAttribute("disabled")).toBe(
    true,
  );
  fireEvent.click(moveButton(`Move ${titles()[1]} up`));
  await waitFor(() => expect(names()[0]).toBe(titles()[1]));
  expect(publicationApi.order).toHaveBeenCalledWith([
    "publication-2",
    "publication-1",
    "publication-3",
    "publication-4",
  ]);
  expect(
    screen.getByRole("status", { name: "Publication order" }).textContent,
  ).toContain("position 1 of 4");
});

it("disables ordering while a reorder is in flight", async () => {
  let finish!: () => void;
  mockPublicationApi(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    initialPublications(),
  );
  await showList();
  fireEvent.click(moveButton(`Move ${titles()[1]} up`));
  await waitFor(() =>
    expect(moveButton(`Move ${titles()[0]} up`).hasAttribute("disabled")).toBe(
      true,
    ),
  );
  await act(async () => {
    finish();
  });
  await waitFor(() =>
    expect(moveButton(`Move ${titles()[0]} up`).hasAttribute("disabled")).toBe(
      false,
    ),
  );
});

it("restores the previous order and reports a membership conflict", async () => {
  await showList();
  vi.spyOn(publicationApi, "order").mockRejectedValue(
    new ApiRequestError("server", 409, {
      code: "CONFLICT",
      message: "The Publication list changed. Reload it and order again.",
    }),
  );
  vi.spyOn(publicationApi, "list").mockResolvedValue([
    initialPublications()[0],
  ]);
  fireEvent.click(moveButton(`Move ${titles()[1]} up`));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "The Publication list changed. Reload it and order again.",
  );
  await waitFor(() => expect(names()).toEqual([titles()[0]]));
});

it("combines search and status, clears both filters and preserves whole-list order", async () => {
  mockPublicationApi(async () => {}, mixedRecords());
  await showList();
  const search = screen.getByRole("searchbox", {
    name: "Search publications",
  }) as HTMLInputElement;
  await chooseStatus("Drafts");
  expect(screen.getByRole("heading", { name: titles()[1] })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: titles()[0] })).toBeNull();
  fireEvent.change(search, { target: { value: "not a match" } });
  expect(
    screen.getByRole("heading", { name: "No matching publications" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(search.value).toBe("");
  expect(names()).toEqual(titles());
  await chooseStatus("Published");
  expect(screen.getByText("Published · Unpublished changes")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: titles()[1] })).toBeNull();
  fireEvent.change(search, { target: { value: "  draft revision  " } });
  expect(moveButton(`Move ${titles()[0]} down`).hasAttribute("disabled")).toBe(
    true,
  );
  fireEvent.click(moveButton(`Move ${titles()[0]} down`));
  expect(publicationApi.order).not.toHaveBeenCalled();
});

it("mounts the published section on demand and restores filtered list state", async () => {
  mockPublicationApi(async () => {}, mixedRecords());
  await showList();
  fireEvent.change(
    screen.getByRole("searchbox", { name: "Search publications" }),
    { target: { value: titles()[1] } },
  );
  await chooseStatus("Drafts");
  vi.stubGlobal("scrollY", 480);
  fireEvent.click(screen.getByRole("button", { name: "Preview publications" }));
  expect(
    await screen.findByRole("article", { name: titles()[0] }),
  ).toBeTruthy();
  expect(screen.queryByRole("article", { name: titles()[1] })).toBeNull();
  expect(screen.queryByText("Draft revision")).toBeNull();
  expect(
    screen
      .getByRole("link", { name: `Read ${titles()[0]}` })
      .getAttribute("href"),
  ).toBe("/publications/publication-1");
  fireEvent.keyDown(window, { key: "Escape" });
  expect(
    (
      screen.getByRole("searchbox", {
        name: "Search publications",
      }) as HTMLInputElement
    ).value,
  ).toBe(titles()[1]);
  expect(screen.getByRole("button", { name: /Status/ }).textContent).toContain(
    "Drafts",
  );
  expect(window.scrollTo).toHaveBeenLastCalledWith({
    top: 480,
    behavior: "instant",
  });
});

it("renders the published stack in saved order", async () => {
  await showList();
  fireEvent.click(moveButton(`Move ${titles()[1]} up`));
  await waitFor(() => expect(names()[0]).toBe(titles()[1]));
  fireEvent.click(screen.getByRole("button", { name: "Preview publications" }));
  await screen.findByRole("article", { name: titles()[1] });
  expect(
    screen
      .getAllByRole("article")
      .map((article) => within(article).getByRole("heading").textContent)[0],
  ).toBe(titles()[1]);
  fireEvent.click(
    screen.getByRole("button", { name: "Exit publication section preview" }),
  );
  expect(names()[0]).toBe(titles()[1]);
});

it("shows an empty publication section when every record is unpublished", async () => {
  mockPublicationApi(
    async () => {},
    initialPublications().map((record) => ({ ...record, published: null })),
  );
  await showList();
  expect(screen.getAllByText("Draft")).toHaveLength(4);
  fireEvent.click(screen.getByRole("button", { name: "Preview publications" }));
  expect(
    await screen.findByRole("heading", { name: "No published publications" }),
  ).toBeTruthy();
  expect(screen.queryByRole("article")).toBeNull();
});
