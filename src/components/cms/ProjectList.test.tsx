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
import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";
import { ProjectProvider } from "@/src/cms/ProjectProvider";
import { projectApi } from "@/src/cms/project-api";
import { initialProjects, type ProjectRecord } from "@/src/cms/projects";
import { mockProjectApi } from "@/src/cms/test-support/mockProjectApi";
import { labProjects } from "@/src/components/project-item/lab-projects";
import { CmsShell } from "./CmsShell";
import { ProjectList } from "./ProjectList";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/admin/projects",
}));
vi.mock("@/src/components/project-item/ProjectDeviceStage", () => ({
  ProjectDeviceStage: ({ platform }: { platform: string }) => (
    <p>{platform} device preview</p>
  ),
}));

function render(ui: ReactNode) {
  return renderPage(
    <CmsQueryProvider accountId="owner">
      <ProjectProvider>{ui}</ProjectProvider>
    </CmsQueryProvider>,
    { wrapper: CmsShell },
  );
}

/** Field Notes keeps unpublished changes; Relay is draft only. */
function mixedRecords(): ProjectRecord[] {
  return initialProjects().map((record) =>
    record.id === "field-notes"
      ? { ...record, draft: { ...record.draft, summary: "Draft revision" } }
      : { ...record, published: null },
  );
}

const names = () =>
  within(screen.getByRole("list"))
    .getAllByRole("heading")
    .map((heading) => heading.textContent);
const moveButton = (name: string) => screen.getByRole("button", { name });

async function showList() {
  render(<ProjectList />);
  await screen.findByRole("heading", { name: "Field Notes" });
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
  mockProjectApi(async () => {}, initialProjects());
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(Element.prototype, "getAnimations");
});

it("lists the saved collection and distinguishes no search results", async () => {
  await showList();
  expect(screen.getByRole("heading", { name: "Relay" })).toBeTruthy();
  fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), {
    target: { value: "missing" },
  });
  expect(
    screen.getByRole("heading", { name: "No matching projects" }),
  ).toBeTruthy();
});

it("reports loading before the collection arrives", async () => {
  vi.spyOn(projectApi, "list").mockImplementation(() => new Promise(() => {}));
  render(<ProjectList />);
  expect(
    await screen.findByRole("status", { name: "Loading projects" }),
  ).toBeTruthy();
});

it("offers a retry when the collection cannot be read", async () => {
  const list = vi
    .spyOn(projectApi, "list")
    .mockRejectedValueOnce(new ApiRequestError("network", null));
  render(<ProjectList />);
  await screen.findByRole("heading", { name: "Couldn’t load projects" });
  list.mockResolvedValue(initialProjects());
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(
    await screen.findByRole("heading", { name: "Field Notes" }),
  ).toBeTruthy();
});

it("submits the complete order and keeps boundaries disabled", async () => {
  await showList();
  expect(moveButton("Move Field Notes up").hasAttribute("disabled")).toBe(true);
  fireEvent.click(moveButton("Move Relay up"));
  await waitFor(() => expect(names()).toEqual(["Relay", "Field Notes"]));
  expect(projectApi.order).toHaveBeenCalledWith(["relay", "field-notes"]);
  expect(
    screen.getByRole("status", { name: "Project order" }).textContent,
  ).toContain("position 1 of 2");
});

it("disables ordering while a reorder is in flight", async () => {
  let finish!: () => void;
  mockProjectApi(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    initialProjects(),
  );
  await showList();
  fireEvent.click(moveButton("Move Relay up"));
  await waitFor(() =>
    expect(moveButton("Move Field Notes up").hasAttribute("disabled")).toBe(
      true,
    ),
  );
  await act(async () => {
    finish();
  });
  await waitFor(() =>
    expect(moveButton("Move Field Notes up").hasAttribute("disabled")).toBe(
      false,
    ),
  );
});

it("restores the previous order and reports a membership conflict", async () => {
  await showList();
  vi.spyOn(projectApi, "order").mockRejectedValue(
    new ApiRequestError("server", 409, {
      code: "CONFLICT",
      message: "The Project list changed. Reload it and order again.",
    }),
  );
  vi.spyOn(projectApi, "list").mockResolvedValue([initialProjects()[0]]);
  fireEvent.click(moveButton("Move Relay up"));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "The Project list changed. Reload it and order again.",
  );
  await waitFor(() => expect(names()).toEqual(["Field Notes"]));
});

it("combines search and status, clears both filters and preserves whole-list order", async () => {
  mockProjectApi(async () => {}, mixedRecords());
  await showList();
  const search = screen.getByRole("searchbox", {
    name: "Search projects",
  }) as HTMLInputElement;
  await chooseStatus("Drafts");
  expect(screen.getByRole("heading", { name: "Relay" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Field Notes" })).toBeNull();
  fireEvent.change(search, { target: { value: "  FIELD  " } });
  expect(
    screen.getByRole("heading", { name: "No matching projects" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(search.value).toBe("");
  expect(names()).toEqual(["Field Notes", "Relay"]);
  await chooseStatus("Published");
  expect(screen.getByText("Published · Unpublished changes")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Relay" })).toBeNull();
  fireEvent.change(search, { target: { value: "  DRAFT REVISION  " } });
  expect(moveButton("Move Field Notes down").hasAttribute("disabled")).toBe(
    true,
  );
  fireEvent.click(moveButton("Move Field Notes down"));
  expect(projectApi.order).not.toHaveBeenCalled();
});

it("mounts the published section on demand and restores filtered list state", async () => {
  mockProjectApi(async () => {}, mixedRecords());
  await showList();
  fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), {
    target: { value: "Relay" },
  });
  await chooseStatus("Drafts");
  expect(screen.queryByText("mobile device preview")).toBeNull();
  vi.stubGlobal("scrollY", 480);
  fireEvent.click(screen.getByRole("button", { name: "Preview projects" }));
  expect(
    await screen.findByRole("article", { name: "Field Notes" }),
  ).toBeTruthy();
  expect(screen.queryByRole("article", { name: "Relay" })).toBeNull();
  expect(screen.queryByText("Draft revision")).toBeNull();
  expect(
    screen
      .getByRole("link", { name: "View Field Notes live" })
      .getAttribute("href"),
  ).toBe(labProjects[0].liveHref);
  fireEvent.keyDown(window, { key: "Escape" });
  expect(
    (
      screen.getByRole("searchbox", {
        name: "Search projects",
      }) as HTMLInputElement
    ).value,
  ).toBe("Relay");
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
  fireEvent.click(moveButton("Move Relay up"));
  await waitFor(() => expect(names()).toEqual(["Relay", "Field Notes"]));
  fireEvent.click(screen.getByRole("button", { name: "Preview projects" }));
  await screen.findByRole("article", { name: "Relay" });
  expect(
    screen
      .getAllByRole("article")
      .map((article) => within(article).getByRole("heading").textContent),
  ).toEqual(["Relay", "Field Notes"]);
  fireEvent.click(
    screen.getByRole("button", { name: "Exit project section preview" }),
  );
  expect(names()).toEqual(["Relay", "Field Notes"]);
});

it("shows an empty project section when every record is unpublished", async () => {
  mockProjectApi(
    async () => {},
    initialProjects().map((record) => ({ ...record, published: null })),
  );
  await showList();
  expect(screen.getAllByText("Draft")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Preview projects" }));
  expect(
    await screen.findByRole("heading", { name: "No published projects" }),
  ).toBeTruthy();
  expect(screen.queryByRole("article")).toBeNull();
});
