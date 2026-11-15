import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";
import { SeoProvider } from "@/src/cms/SeoProvider";
import type { SeoInput, SeoRecord } from "@/src/seo/content";
import { SeoEditor } from "./SeoEditor";
import { SeoList } from "./SeoList";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const defaultId = "00000000-0000-4000-8000-000000000001";
const overrideId = "00000000-0000-4000-8000-000000000002";
let records: SeoRecord[];
let put: (id: string, value: SeoInput) => Promise<Response>;
let fetch: ReturnType<typeof vi.fn>;
beforeEach(() => {
  records = [
    {
      id: defaultId,
      path: "/",
      title: "Saved default",
      description: "Saved description",
    },
    {
      id: overrideId,
      path: "/remote",
      title: "",
      description: "Remote description",
    },
  ];
  put = async (id, value) => {
    const canonical = { id, ...value };
    records = records.map((record) => (record.id === id ? canonical : record));
    return Response.json(canonical);
  };
  fetch = vi.fn(async (url: string, options?: RequestInit) => {
    const id = url.split("/").at(-1)!;
    if (options?.method === "PUT")
      return put(id, JSON.parse(String(options.body)));
    return Response.json(
      url === "/api/admin/seo"
        ? records
        : records.find((record) => record.id === id),
    );
  });
  vi.stubGlobal("fetch", fetch);
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
function Page({
  id = overrideId,
  list = false,
}: {
  id?: string;
  list?: boolean;
}) {
  return (
    <CmsQueryProvider accountId="owner">
      <SeoProvider>
        {list ? <SeoList /> : <SeoEditor key={id} id={id} />}
      </SeoProvider>
    </CmsQueryProvider>
  );
}
const input = (name: string) =>
  screen.getByRole("textbox", { name }) as HTMLInputElement;
const change = (name: string, value: string) =>
  fireEvent.change(input(name), { target: { value } });
const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
const writes = () =>
  fetch.mock.calls.filter(([, options]) => options?.method === "PUT");

it("saves an existing override by UUID and adopts canonical path/content in form and list", async () => {
  put = async (id, value) => {
    const canonical = {
      ...value,
      id,
      path: "/canonical",
      title: "Canonical title",
    };
    records = records.map((record) => (record.id === id ? canonical : record));
    return Response.json(canonical);
  };
  const page = render(<Page />);
  await screen.findByRole("textbox", { name: "Path" });
  change("Path", "/submitted/");
  change("SEO title override", "Submitted");
  save();
  await waitFor(() => expect(input("Path").value).toBe("/canonical"));
  expect(input("SEO title override").value).toBe("Canonical title");
  expect(writes()).toHaveLength(1);
  expect(JSON.parse(writes()[0][1]!.body as string)).toEqual({
    path: "/submitted/",
    title: "Submitted",
    description: "Remote description",
  });
  expect(writes()[0][0]).toBe(`/api/admin/seo/${overrideId}`);
  await waitFor(() =>
    expect(
      screen.getByRole("status", { name: "SEO save status" }).textContent,
    ).toContain("No unsaved changes"),
  );
  page.rerender(<Page list />);
  expect(await screen.findByRole("link", { name: /\/canonical/ })).toBeTruthy();
  expect(screen.queryByRole("link", { name: /\/remote/ })).toBeNull();
});

it("saves defaults by their persisted UUID with fixed / path", async () => {
  render(<Page id="defaults" />);
  await screen.findByRole("textbox", { name: "Default title" });
  change("Default title", "Changed defaults");
  save();
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(writes()[0][0]).toBe(`/api/admin/seo/${defaultId}`);
  expect(JSON.parse(writes()[0][1]!.body as string)).toEqual({
    path: "/",
    title: "Changed defaults",
    description: "Saved description",
  });
  await waitFor(() => expect(records[0].title).toBe("Changed defaults"));
  expect(screen.queryByRole("textbox", { name: "Path" })).toBeNull();
});

it("blocks duplicate Save and edits while pending, then permits Discard to canonical values", async () => {
  let finish!: () => void;
  put = (id, value) =>
    new Promise((resolve) => {
      finish = () => {
        const canonical = { id, ...value, path: "/saved" };
        records = records.map((record) =>
          record.id === id ? canonical : record,
        );
        resolve(Response.json(canonical));
      };
    });
  render(<Page />);
  await screen.findByRole("textbox", { name: "Path" });
  change("Path", "/submitted");
  save();
  save();
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(
    screen
      .getByRole("button", { name: "Discard changes" })
      .hasAttribute("disabled"),
  ).toBe(true);
  expect(input("Path").matches(":disabled")).toBe(true);
  expect(input("SEO title override").matches(":disabled")).toBe(true);
  await act(async () => finish());
  expect(input("Path").matches(":disabled")).toBe(false);
  change("Path", "/later");
  change("SEO title override", "Later title");
  expect(input("Path").value).toBe("/later");
  expect(input("SEO title override").value).toBe("Later title");
  expect(
    screen.getByRole("status", { name: "SEO save status" }).textContent,
  ).toContain("Unsaved changes");
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(input("Path").value).toBe("/saved");
});

it("maps server field issues and unknown feedback, preserves input and retries after correction", async () => {
  put = async () =>
    Response.json(
      {
        error: {
          code: "CONFLICT",
          message: "Path collision",
          issues: [
            { pointer: "/title", message: "Title rejected" },
            { pointer: "/path", message: "Choose a path" },
            { pointer: "/unknown", message: "Review content" },
          ],
        },
      },
      { status: 409 },
    );
  render(<Page />);
  await screen.findByRole("textbox", { name: "Path" });
  change("Path", "/submitted");
  save();
  await screen.findByText("Choose a path");
  await waitFor(() => expect(document.activeElement).toBe(input("Path")));
  expect(screen.getByRole("alert").textContent).toContain("Review content");
  expect(input("Path").value).toBe("/submitted");
  change("Path", "/corrected");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(input("SEO title override").getAttribute("aria-invalid")).not.toBe(
    "true",
  );
  save();
  await waitFor(() => expect(writes()).toHaveLength(2));
});

it.each([401, 403, 404, 500])(
  "retains form input after Save fails with %s",
  async (status) => {
    put = async () =>
      Response.json(
        {
          error: {
            code:
              status === 404
                ? "NOT_FOUND"
                : status === 401
                  ? "UNAUTHENTICATED"
                  : status === 403
                    ? "FORBIDDEN"
                    : "INTERNAL_ERROR",
            message: "Save failed",
          },
        },
        { status },
      );
    render(<Page />);
    await screen.findByRole("textbox", { name: "Path" });
    change("Path", "/keep");
    save();
    await screen.findByRole("alert");
    expect(input("Path").value).toBe("/keep");
    expect(
      screen
        .getByRole("button", { name: "Save changes" })
        .hasAttribute("disabled"),
    ).toBe(false);
    expect(writes()).toHaveLength(1);
  },
);

it("retains input after an unconfirmed save while refreshing server state without reposting", async () => {
  put = async (id, value) => {
    records = records.map((record) =>
      record.id === id ? { id, ...value, path: "/server-canonical" } : record,
    );
    throw new TypeError("Response lost");
  };
  render(<Page />);
  await screen.findByRole("textbox", { name: "Path" });
  change("Path", "/unconfirmed");
  save();
  await screen.findByText("Couldn’t confirm the save.");
  await waitFor(() =>
    expect(
      fetch.mock.calls.filter(([, options]) => options?.method === "GET")
        .length,
    ).toBeGreaterThanOrEqual(4),
  );
  expect(input("Path").value).toBe("/unconfirmed");
  expect(writes()).toHaveLength(1);
});

it("does not overwrite a later draft when an earlier editor's Save completes after unmount", async () => {
  let finish!: () => void;
  put = (id, value) =>
    new Promise((resolve) => {
      finish = () =>
        resolve(Response.json({ ...value, id, title: "Canonical old save" }));
    });
  const page = render(<Page />);
  await screen.findByRole("textbox", { name: "Path" });
  change("SEO title override", "Submitted");
  save();
  await waitFor(() => expect(writes()).toHaveLength(1));
  page.unmount();
  const later = render(<Page />);
  await screen.findByRole("textbox", { name: "Path" });
  change("SEO title override", "Newer session");
  later.unmount();
  await act(async () => finish());
  const draft = JSON.parse(
    localStorage.getItem(`portfolio:cms-drafts:v1:seo:${overrideId}`)!,
  );
  expect(draft.value.title).toBe("Newer session");
});
