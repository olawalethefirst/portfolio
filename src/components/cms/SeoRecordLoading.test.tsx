import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";
import { SeoProvider } from "@/src/cms/SeoProvider";
import { SeoEditor } from "./SeoEditor";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const defaultId = "00000000-0000-4000-8000-000000000001";
const overrideId = "00000000-0000-4000-8000-000000000002";
const defaults = {
  id: defaultId,
  path: "/",
  title: "Saved default",
  description: "Saved description",
};
const override = {
  id: overrideId,
  path: "/remote",
  title: "",
  description: "Remote description",
};
let fetch: ReturnType<typeof vi.fn>;
beforeEach(() => {
  push.mockReset();
  fetch = vi.fn(async (url: string) =>
    Response.json(
      url === "/api/admin/seo"
        ? [defaults, override]
        : url.endsWith(defaultId)
          ? defaults
          : override,
    ),
  );
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
function Page({ id = overrideId }: { id?: string }) {
  return (
    <CmsQueryProvider accountId="owner">
      <SeoProvider>
        <SeoEditor key={id} id={id} />
      </SeoProvider>
    </CmsQueryProvider>
  );
}

it("loads an existing override by UUID with saved default inheritance", async () => {
  render(<Page />);
  const path = await screen.findByRole("textbox", { name: "Path" });
  expect((path as HTMLInputElement).value).toBe("/remote");
  expect(screen.getByText("Saved default")).toBeTruthy();
  expect(
    (
      screen.getByRole("textbox", {
        name: "SEO description override",
      }) as HTMLTextAreaElement
    ).value,
  ).toBe("Remote description");
  expect(fetch).toHaveBeenCalledWith(
    `/api/admin/seo/${overrideId}`,
    expect.objectContaining({ method: "GET", signal: expect.any(AbortSignal) }),
  );
  expect(
    screen
      .getByRole("button", { name: "Save changes" })
      .hasAttribute("disabled"),
  ).toBe(true);
  expect(screen.getByRole("button", { name: "Delete override" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(
    fetch.mock.calls.every(([, options]) => options?.method === "GET"),
  ).toBe(true);
});

it.each(["defaults", defaultId])(
  "loads defaults by persistent UUID for route %s",
  async (id) => {
    render(<Page id={id} />);
    const title = await screen.findByRole("textbox", { name: "Default title" });
    expect((title as HTMLInputElement).value).toBe("Saved default");
    expect(screen.queryByRole("textbox", { name: "Path" })).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      `/api/admin/seo/${defaultId}`,
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetch.mock.calls.some(([url]) => url.endsWith("/defaults"))).toBe(
      false,
    );
  },
);

it("shows the shared spinner with no visible loading text while the record loads", async () => {
  let finish!: () => void;
  fetch.mockImplementation(async (url: string) =>
    url === "/api/admin/seo"
      ? Response.json([defaults, override])
      : new Promise<Response>((resolve) => {
          finish = () => resolve(Response.json(override));
        }),
  );
  render(<Page />);
  expect(
    screen.getByRole("status", { name: "Loading SEO record" }).textContent,
  ).toBe("");
  expect(
    screen.getByRole("heading", { level: 1, name: "Edit SEO override" }),
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Back to SEO" })).toBeTruthy();
  expect(screen.queryByRole("textbox")).toBeNull();
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  await act(async () => finish());
  await screen.findByRole("textbox", { name: "Path" });
});

it.each([401, 403, 404, 500])(
  "shows record error %s without fixtures or automatic retries",
  async (status) => {
    fetch.mockImplementation(async (url: string) =>
      url === "/api/admin/seo"
        ? Response.json([defaults, override])
        : Response.json(
            {
              error: {
                code: status === 404 ? "NOT_FOUND" : "INTERNAL_ERROR",
                message: "Read failed",
              },
            },
            { status },
          ),
    );
    render(<Page />);
    await screen.findByRole("alert");
    expect(
      screen.getByRole("heading", { level: 1, name: "Edit SEO override" }),
    ).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(
      fetch.mock.calls.filter(([url]) => url.endsWith(overrideId)),
    ).toHaveLength(1);
    // A missing record cannot be fixed by retrying; any other failure can.
    expect(Boolean(screen.queryByRole("button", { name: "Try again" }))).toBe(
      status !== 404,
    );
    fireEvent.click(screen.getByRole("button", { name: "Back to SEO" }));
    expect(push).toHaveBeenCalledWith("/admin/seo");
  },
);

it("reports missing defaults instead of loading a demo default", async () => {
  fetch.mockResolvedValue(Response.json([]));
  render(<Page id="defaults" />);
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("retains existing local draft behavior when reopening a server record", async () => {
  const page = render(<Page />);
  const path = await screen.findByRole("textbox", { name: "Path" });
  fireEvent.change(path, { target: { value: "/local-change" } });
  page.unmount();
  render(<Page />);
  expect(
    ((await screen.findByRole("textbox", { name: "Path" })) as HTMLInputElement)
      .value,
  ).toBe("/local-change");
});
