import {
  act,
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

it("shows a load failure under the page header without demo content and retries on request", async () => {
  let offline = true;
  read = async () => {
    if (offline) throw new TypeError("offline");
    return Response.json(saved);
  };
  render(<Page />);
  expect((await screen.findByRole("alert")).textContent).toContain("Couldn’t load Hero");
  expect(screen.getByRole("heading", { level: 1, name: "Hero" })).toBeTruthy();
  expect(screen.queryByRole("textbox", { name: "Headline" })).toBeNull();
  offline = false;
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await loaded();
  expect(headline().value).toBe("Server headline");
});

const draftKey = "portfolio:cms-drafts:v1:hero:hero";
function storeDraft() {
  const value = structuredClone(saved);
  value.headline = "Recovered headline";
  value.stages.idea.tagline = "Recovered tagline";
  localStorage.setItem(draftKey, JSON.stringify({ id: "hero", value }));
  return value;
}
const choose = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

it("starts from saved values and assembles selected draft fields without saving alternatives", async () => {
  const draft = storeDraft();
  render(<Page />);
  await loaded();
  expect(headline().value).toBe(saved.headline);
  expect(screen.getByRole("button", { name: "Save changes" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByText("You have local changes. Review them beside each field.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Use draft Eyebrow" })).toBeNull();
  choose("Use draft Headline");
  expect(headline().value).toBe(draft.headline);
  expect((field("Idea", "Tagline") as HTMLInputElement).value).toBe(saved.stages.idea.tagline);
  choose("Use saved Headline");
  expect(headline().value).toBe(saved.headline);
  expect(screen.getByRole("button", { name: "Save changes" }).hasAttribute("disabled")).toBe(true);
  choose("Use draft Idea tagline");
  edit("New headline");
  save();
  await waitFor(() => expect(screen.getByRole("status", { name: "Hero save status" }).textContent).toBe("No unsaved changes"));
  expect(saved.headline).toBe("New headline");
  expect(saved.stages.idea.tagline).toBe(draft.stages.idea.tagline);
  expect(localStorage.getItem(draftKey)).toBeNull();
  expect(screen.queryByRole("button", { name: /Use (draft|saved)/ })).toBeNull();
});

it("preserves unreviewed draft fields while typing and offers them again after reload", async () => {
  const draft = storeDraft();
  const page = render(<Page />);
  await loaded();
  edit("Later local headline");
  choose("Use saved Headline");
  expect(headline().value).toBe(saved.headline);
  page.unmount();
  render(<Page />);
  await loaded();
  expect(headline().value).toBe(saved.headline);
  choose("Use draft Headline");
  expect(headline().value).toBe("Later local headline");
  choose("Use draft Idea tagline");
  expect((field("Idea", "Tagline") as HTMLInputElement).value).toBe(draft.stages.idea.tagline);
});

it("retains the draft after an unconfirmed Save and does not let recovery reads replace edits", async () => {
  storeDraft();
  put = async (value) => {
    saved = { ...value, headline: "Changed remotely" };
    throw new TypeError("Response lost");
  };
  const page = render(<Page />);
  await loaded();
  choose("Use draft Headline");
  save();
  await screen.findByText("Couldn’t confirm the save.");
  await waitFor(() => expect(fetch.mock.calls.filter(([, options]) => options?.method !== "PUT")).toHaveLength(2));
  expect(headline().value).toBe("Recovered headline");
  expect(localStorage.getItem(draftKey)).not.toBeNull();
  choose("Use saved Headline");
  expect(headline().value).toBe("Changed remotely");
  page.unmount();
  render(<Page />);
  await loaded();
  choose("Use draft Headline");
  expect(headline().value).toBe("Recovered headline");
});

it("lets Discard clear unselected recovery values even when the form is clean", async () => {
  storeDraft();
  render(<Page />);
  await loaded();
  choose("Discard changes");
  expect(headline().value).toBe(saved.headline);
  expect(localStorage.getItem(draftKey)).toBeNull();
  expect(screen.queryByRole("button", { name: /Use (draft|saved)/ })).toBeNull();
});

it("keeps invalid recovered values available and never submits them until corrected", async () => {
  const draft = storeDraft();
  draft.headline = "";
  localStorage.setItem(draftKey, JSON.stringify({ id: "hero", value: draft }));
  render(<Page />);
  await loaded();
  choose("Use draft Headline");
  save();
  expect(fetch.mock.calls.some(([, options]) => options?.method === "PUT")).toBe(false);
  expect(localStorage.getItem(draftKey)).not.toBeNull();
  expect(headline().getAttribute("aria-invalid")).toBe("true");
  expect(headline().value).toBe("");
});

it.each([false, true])("finishes save cleanup after navigation while preserving later drafts: %s", async (laterEdit) => {
  let finish!: () => void;
  put = (value) => new Promise<Response>((resolve) => {
    finish = () => { saved = value; resolve(Response.json(value)); };
  });
  const page = render(<Page />);
  await loaded();
  edit("Submitted");
  save();
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  page.unmount();
  if (laterEdit) {
    const next = render(<Page />);
    await loaded();
    edit("Later edit");
    next.unmount();
  }
  await act(async () => finish());
  expect(saved.headline).toBe("Submitted");
  if (laterEdit) {
    expect(JSON.parse(localStorage.getItem(draftKey)!).value.headline).toBe("Later edit");
  } else {
    expect(localStorage.getItem(draftKey)).toBeNull();
  }
});


it.each([false, true])("keeps an absent or equal draft out of review: stored=%s", async (stored) => {
  if (stored) localStorage.setItem(draftKey, JSON.stringify({ id: "hero", value: saved }));
  render(<Page />);
  await loaded();
  expect(screen.queryByRole("button", { name: /Use (draft|saved)/ })).toBeNull();
  expect(screen.queryByText("You have local changes. Review them beside each field.")).toBeNull();
  expect(screen.getByRole("button", { name: "Save changes" }).hasAttribute("disabled")).toBe(true);
});
