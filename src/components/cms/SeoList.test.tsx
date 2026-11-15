import { CmsShell } from "./CmsShell";
import type { ReactNode } from "react";
import {
  fireEvent,
  render as renderPage,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";
import type { SeoRecord } from "@/src/seo/content";
import { SeoList } from "./SeoList";
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <CmsQueryProvider accountId="test-owner">
      <CmsShell>{children}</CmsShell>
    </CmsQueryProvider>
  );
}
async function render(ui: ReactNode) {
  const page = renderPage(ui, { wrapper: Wrapper });
  await screen.findByRole("searchbox", { name: "Search SEO paths" });
  return page;
}
let records: SeoRecord[];
let fetch: ReturnType<typeof vi.fn>;
const contactId = "00000000-0000-4000-8000-000000000002";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/admin/publications",
}));
beforeEach(() => {
  records = [
    {
      id: "00000000-0000-4000-8000-000000000001",
      path: "/",
      title: "Saved defaults",
      description: "Saved default description",
    },
    {
      id: contactId,
      path: "/contact",
      title: "",
      description: "Contact details",
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      path: "/notes",
      title: "Notes",
      description: "",
    },
  ];
  fetch = vi.fn(async () => Response.json(records));
  vi.stubGlobal("fetch", fetch);
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
});
afterEach(() => vi.unstubAllGlobals());
it("lists only saved overrides with persistent links, inherited metadata and search", async () => {
  await render(<SeoList />);
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
  expect(screen.queryByRole("button", { name: /Status/ })).toBeNull();
  expect(
    screen.getByRole("link", { name: /\/contact/ }).getAttribute("href"),
  ).toBe(`/admin/seo/${contactId}`);
  expect(screen.getByText("Effective title: Saved defaults")).toBeTruthy();
  expect(screen.getByText("Saved default description")).toBeTruthy();
  expect(fetch).toHaveBeenCalledWith(
    "/api/admin/seo",
    expect.objectContaining({ method: "GET", signal: expect.any(AbortSignal) }),
  );
  const search = screen.getByRole("searchbox", { name: "Search SEO paths" });
  fireEvent.change(search, { target: { value: " CONTACT " } });
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  fireEvent.change(search, { target: { value: "no-such-override" } });
  expect(screen.getByText("No matching SEO overrides")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
  expect((search as HTMLInputElement).value).toBe("");
  expect(
    screen.queryByRole("button", { name: /Delete|Move up|Move down|Preview/ }),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Edit defaults" }));
  expect(push).toHaveBeenCalledWith("/admin/seo/defaults");
  fireEvent.click(screen.getByRole("button", { name: "New override" }));
  expect(push).toHaveBeenCalledWith("/admin/seo/new");
});
it("distinguishes an empty override collection from no matches", async () => {
  records = records.slice(0, 1);
  await render(<SeoList />);
  expect(screen.getByText("No SEO overrides yet")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
  expect(screen.getByRole("button", { name: "New override" })).toBeTruthy();
});

it("uses an accessible HeroUI spinner without visible loading text until data arrives", async () => {
  let finish!: () => void;
  fetch.mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        finish = () => resolve(Response.json(records));
      }),
  );
  renderPage(<SeoList />, { wrapper: Wrapper });
  const spinner = screen.getByRole("status", { name: "Loading SEO" });
  expect(spinner.textContent).toBe("");
  expect(screen.queryByRole("listitem")).toBeNull();
  expect(screen.queryByRole("searchbox")).toBeNull();
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  finish();
  await screen.findByRole("link", { name: /\/contact/ });
  expect(screen.queryByRole("status", { name: "Loading SEO" })).toBeNull();
});

it.each([401, 403, 500])(
  "shows load failure without demo data or automatic retry: %s",
  async (status) => {
    fetch.mockResolvedValue(
      Response.json(
        {
          error: {
            code:
              status === 401
                ? "UNAUTHENTICATED"
                : status === 403
                  ? "FORBIDDEN"
                  : "INTERNAL_ERROR",
            message: "Read failed",
          },
        },
        { status },
      ),
    );
    renderPage(<SeoList />, { wrapper: Wrapper });
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("listitem")).toBeNull();
    expect(screen.queryByText("No SEO overrides yet")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  },
);

it("reports missing initialized defaults instead of rendering inherited fixture values", async () => {
  records = records.filter((record) => record.path !== "/");
  renderPage(<SeoList />, { wrapper: Wrapper });
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByRole("listitem")).toBeNull();
});

it("rejects a malformed collection response without showing an empty success state", async () => {
  fetch.mockResolvedValue(
    Response.json([{ id: contactId, path: "/contact", title: 42 }]),
  );
  renderPage(<SeoList />, { wrapper: Wrapper });
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByText("No SEO overrides yet")).toBeNull();
});
