import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";
import { initialHero, type HeroDraft } from "@/src/cms/hero";
import { HeroEditor } from "./HeroEditor";

vi.mock("next/dynamic", () => ({ default: () => () => null }));

let saved: HeroDraft;
let put: (value: HeroDraft) => Promise<Response>;
let read: () => Promise<Response>;
let fetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  saved = structuredClone(initialHero);
  saved.headline = "Server headline";
  read = async () => Response.json(saved);
  put = async (value) => {
    saved = value;
    return Response.json(saved);
  };
  fetch = vi.fn(async (_url: string, options?: RequestInit) =>
    options?.method === "PUT" ? put(JSON.parse(String(options.body))) : read(),
  );
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});
afterEach(() => vi.unstubAllGlobals());

function Page({ accountId = "owner" }: { accountId?: string }) {
  return (
    <CmsQueryProvider accountId={accountId}>
      <HeroEditor />
    </CmsQueryProvider>
  );
}
const headline = () =>
  screen.getByRole("textbox", { name: "Headline" }) as HTMLInputElement;
const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
const edit = (text: string) =>
  fireEvent.change(headline(), { target: { value: text } });
const field = (stage: string, name: string) =>
  within(screen.getByRole("region", { name: stage })).getByRole("textbox", {
    name,
  });
async function loaded() {
  await screen.findByRole("textbox", { name: "Headline" });
}

it("loads the server baseline, saves JSON and displays canonical content", async () => {
  render(<Page />);
  await loaded();
  expect(headline().value).toBe("Server headline");
  edit("Submitted headline");
  put = async (value) => {
    saved = { ...value, headline: "Canonical headline" };
    return Response.json(saved);
  };
  save();
  await waitFor(() => expect(headline().value).toBe("Canonical headline"));
  expect(fetch).toHaveBeenCalledWith(
    "/api/admin/hero",
    expect.objectContaining({
      method: "PUT",
      body: expect.stringContaining("Submitted headline"),
    }),
  );
  expect(
    screen.getByRole("status", { name: "Hero save status" }).textContent,
  ).toBe("No unsaved changes");
});

it("maps nested server issues, focuses by visual order and retains unknown issues as general feedback", async () => {
  put = async () =>
    Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Check content",
          issues: [
            { pointer: "/stages/iterate/tagline", message: "Iterate denied" },
            { pointer: "/stages/idea/description", message: "Idea denied" },
            { pointer: '/unknown\"] input', message: "Review the whole form" },
          ],
        },
      },
      { status: 422 },
    );
  render(<Page />);
  await loaded();
  edit("Submitted");
  save();
  await screen.findByText("Idea denied");
  await waitFor(() =>
    expect(document.activeElement).toBe(field("Idea", "Description")),
  );
  expect(field("Iterate", "Tagline").getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByRole("alert").textContent).toContain(
    "Review the whole form",
  );
  expect(headline().value).toBe("Submitted");
});

it(
  "shows one save error and clears it when editing or discarding",
  async () => {
    put = async () =>
      Response.json(
        { error: { code: "INTERNAL_ERROR", message: "Save failed" } },
        { status: 500 },
      );
    render(<Page />);
    await loaded();
    edit("Keep my draft");
    save();
    await screen.findByText("Save failed");
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    edit("Corrected draft");
    expect(screen.queryByRole("alert")).toBeNull();
    save();
    await screen.findByText("Save failed");
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(screen.queryByRole("alert")).toBeNull();
  },
);

it("shows load failure without editing demo content or adding recovery controls", async () => {
  read = async () => {
    throw new TypeError("offline");
  };
  render(<Page />);
  await screen.findByRole("alert");
  expect(screen.queryByRole("textbox", { name: "Headline" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Retry loading" })).toBeNull();
});
