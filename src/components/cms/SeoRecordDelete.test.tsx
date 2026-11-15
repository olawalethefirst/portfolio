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
import { SeoProvider } from "@/src/cms/SeoProvider";
import type { SeoRecord } from "@/src/seo/content";
import { SeoEditor } from "./SeoEditor";
import { SeoList } from "./SeoList";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const defaultId = "00000000-0000-4000-8000-000000000001";
const overrideId = "00000000-0000-4000-8000-000000000002";
let records: SeoRecord[];
let remove: () => Promise<Response>;
let fetch: ReturnType<typeof vi.fn>;
beforeEach(() => {
  push.mockReset();
  records = [
    {
      id: defaultId,
      path: "/",
      title: "Saved default",
      description: "Saved description",
    },
    { id: overrideId, path: "/remote", title: "Remote title", description: "" },
  ];
  remove = async () => {
    records = records.filter((record) => record.id !== overrideId);
    return new Response(null, { status: 204 });
  };
  fetch = vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === "DELETE") return remove();
    const record = records.find(
      (record) => record.id === url.split("/").at(-1),
    );
    return url === "/api/admin/seo"
      ? Response.json(records)
      : record
        ? Response.json(record)
        : Response.json(
            { error: { code: "NOT_FOUND", message: "Unavailable" } },
            { status: 404 },
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
  vi.stubGlobal("scrollTo", vi.fn());
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
const title = () =>
  screen.getByRole("textbox", {
    name: "SEO title override",
  }) as HTMLInputElement;
const deletes = () =>
  fetch.mock.calls.filter(([, options]) => options?.method === "DELETE");
async function open() {
  await screen.findByRole("textbox", { name: "Path" });
  fireEvent.change(title(), { target: { value: "Unsaved title" } });
  fireEvent.click(screen.getByRole("button", { name: "Delete override" }));
  return screen.findByRole("dialog", { name: "Delete this override?" });
}

it("requires confirmation, preserves cancellation, and removes saved override/draft after 204", async () => {
  const page = render(<Page />);
  let dialog = await open();
  expect(within(dialog).getByText(/\/remote/)).toBeTruthy();
  expect(deletes()).toHaveLength(0);
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(title().value).toBe("Unsaved title");
  dialog = await open();
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
  await waitFor(() =>
    expect(push).toHaveBeenCalledExactlyOnceWith("/admin/seo"),
  );
  expect(deletes()).toHaveLength(1);
  expect(deletes()[0][0]).toBe(`/api/admin/seo/${overrideId}`);
  expect(deletes()[0][1]?.body).toBeUndefined();
  page.rerender(<Page list />);
  expect(await screen.findByText(/No SEO overrides/)).toBeTruthy();
  expect(screen.queryByRole("link", { name: /\/remote/ })).toBeNull();
  page.unmount();
  expect(
    localStorage.getItem(`portfolio:cms-drafts:v1:seo:${overrideId}`),
  ).toBeNull();
});

it("blocks duplicate confirmation and dismissal while deletion is pending", async () => {
  let finish!: () => void;
  remove = () =>
    new Promise((resolve) => {
      finish = () => resolve(new Response(null, { status: 204 }));
    });
  render(<Page />);
  const dialog = await open();
  const confirm = within(dialog).getByRole("button", { name: "Delete" });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  await waitFor(() => expect(deletes()).toHaveLength(1));
  expect(
    within(dialog)
      .getByRole("button", { name: "Cancel" })
      .hasAttribute("disabled"),
  ).toBe(true);
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(screen.getByRole("dialog")).toBe(dialog);
  expect(
    screen
      .getByRole("button", { name: "Save changes", hidden: true })
      .hasAttribute("disabled"),
  ).toBe(true);
  await act(async () => finish());
  await waitFor(() => expect(push).toHaveBeenCalledOnce());
});

it.each([401, 403, 404, 409, 500])(
  "retains edits and draft when deletion fails with %s",
  async (status) => {
    remove = async () =>
      Response.json(
        {
          error: {
            code:
              status === 404
                ? "NOT_FOUND"
                : status === 409
                  ? "CONFLICT"
                  : status === 401
                    ? "UNAUTHENTICATED"
                    : status === 403
                      ? "FORBIDDEN"
                      : "INTERNAL_ERROR",
            message: "Delete failed",
          },
        },
        { status },
      );
    const page = render(<Page />);
    const dialog = await open();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(await within(dialog).findByRole("alert")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(title().value).toBe("Unsaved title");
    expect(deletes()).toHaveLength(1);
    page.unmount();
    expect(
      JSON.parse(
        localStorage.getItem(`portfolio:cms-drafts:v1:seo:${overrideId}`)!,
      ).value.title,
    ).toBe("Unsaved title");
  },
);

it("does not repeat an unconfirmed deletion or clear retained edits", async () => {
  remove = async () => {
    records = records.filter((record) => record.id !== overrideId);
    throw new TypeError("Response lost");
  };
  render(<Page />);
  const dialog = await open();
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
  expect(
    await within(dialog).findByText(
      "Couldn’t confirm the deletion. Your changes are still here.",
    ),
  ).toBeTruthy();
  await waitFor(() =>
    expect(
      fetch.mock.calls.filter(([, options]) => options?.method === "GET")
        .length,
    ).toBeGreaterThanOrEqual(4),
  );
  expect(deletes()).toHaveLength(1);
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(title().value).toBe("Unsaved title");
});

it.each(["defaults", defaultId, "new"])(
  "never exposes deletion for %s",
  async (id) => {
    render(<Page id={id} />);
    await screen.findByRole("textbox", {
      name: id === "new" ? "Path" : "Default title",
    });
    expect(
      screen.queryByRole("button", { name: "Delete override" }),
    ).toBeNull();
    expect(deletes()).toHaveLength(0);
  },
);

it("does not clear a newer editor draft or navigate after an unmounted deletion completes", async () => {
  let finish!: () => void;
  remove = () =>
    new Promise((resolve) => {
      finish = () => resolve(new Response(null, { status: 204 }));
    });
  const page = render(<Page />);
  const dialog = await open();
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(deletes()).toHaveLength(1));
  page.unmount();
  const newer = render(<Page />);
  await screen.findByRole("textbox", { name: "Path" });
  fireEvent.change(title(), { target: { value: "Newer session" } });
  newer.unmount();
  await act(async () => finish());
  expect(push).not.toHaveBeenCalled();
  expect(
    JSON.parse(
      localStorage.getItem(`portfolio:cms-drafts:v1:seo:${overrideId}`)!,
    ).value.title,
  ).toBe("Newer session");
});
