import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";
import { SeoProvider } from "@/src/cms/SeoProvider";
import type { SeoInput, SeoRecord } from "@/src/seo/content";
import { SeoEditor } from "./SeoEditor";
import { SeoList } from "./SeoList";

const { replace, push } = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push }) }));
const defaultId = "00000000-0000-4000-8000-000000000001";
const createdId = "00000000-0000-4000-8000-000000000003";
let records: SeoRecord[];
let post: (value: SeoInput) => Promise<Response>;
let fetch: ReturnType<typeof vi.fn>;
beforeEach(() => {
  replace.mockReset(); push.mockReset();
  records = [
    { id: defaultId, path: "/", title: "Saved default", description: "Saved description" },
    { id: "00000000-0000-4000-8000-000000000002", path: "/taken", title: "Taken", description: "" },
  ];
  post = async (value) => {
    const canonical = { ...value, id: createdId, path: "/canonical" };
    records.push(canonical);
    return Response.json(canonical, { status: 201 });
  };
  fetch = vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === "POST") return post(JSON.parse(String(options.body)));
    const id = url.split("/").at(-1)!;
    if (options?.method === "PUT") {
      const canonical = { ...JSON.parse(String(options.body)), id };
      records = records.map((record) => record.id === id ? canonical : record);
      return Response.json(canonical);
    }
    return Response.json(url === "/api/admin/seo" ? records : records.find((record) => record.id === id));
  });
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => vi.unstubAllGlobals());
function Page({ id = "new", list = false }: { id?: string; list?: boolean }) {
  return <CmsQueryProvider accountId="owner"><SeoProvider>{list ? <SeoList /> : <SeoEditor key={id} id={id} />}</SeoProvider></CmsQueryProvider>;
}
const input = (name: string) => screen.getByRole("textbox", { name }) as HTMLInputElement;
const change = (name: string, value: string) => fireEvent.change(input(name), { target: { value } });
const save = () => fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
const posts = () => fetch.mock.calls.filter(([, options]) => options?.method === "POST");
async function fill() {
  await screen.findByRole("textbox", { name: "Path" });
  change("Path", "/submitted/"); change("SEO title override", "Submitted");
}

it("creates without a client ID, navigates to returned UUID, then saves via PUT and lists canonical content", async () => {
  const page = render(<Page />); await fill();
  expect(screen.getByText("Saved description")).toBeTruthy();
  save();
  await waitFor(() => expect(replace).toHaveBeenCalledExactlyOnceWith(`/admin/seo/${createdId}`));
  expect(posts()).toHaveLength(1);
  expect(posts()[0][0]).toBe("/api/admin/seo");
  expect(JSON.parse(String(posts()[0][1]?.body))).toEqual({ path: "/submitted/", title: "Submitted", description: "" });
  page.rerender(<Page id={createdId} />);
  await waitFor(() => expect(input("Path").value).toBe("/canonical"));
  change("SEO title override", "Updated"); save();
  await waitFor(() => expect(records.find((record) => record.id === createdId)?.title).toBe("Updated"));
  expect(fetch.mock.calls.filter(([, options]) => options?.method === "PUT")[0][0]).toBe(`/api/admin/seo/${createdId}`);
  expect(posts()).toHaveLength(1);
  page.rerender(<Page list />);
  expect(await screen.findByRole("link", { name: /\/canonical/ })).toBeTruthy();
});

it("validates blank fields and normalized saved path collisions before sending POST", async () => {
  render(<Page />); await screen.findByRole("textbox", { name: "Path" });
  save(); await waitFor(() => expect(document.activeElement).toBe(input("Path")));
  expect(posts()).toHaveLength(0);
  change("Path", "/%74aken/"); change("SEO title override", "Title"); save();
  expect(await screen.findByText(/already exists/)).toBeTruthy();
  expect(posts()).toHaveLength(0);
  change("Path", "/"); save();
  expect(posts()).toHaveLength(0);
  expect(replace).not.toHaveBeenCalled();
});

it.each(["navigation", "reload"])("opens New with empty fields after confirmed creation and %s", async (reopen) => {
  const page = render(<Page />);
  await fill();
  change("SEO description override", "Submitted description");
  save();
  await waitFor(() => expect(replace).toHaveBeenCalledExactlyOnceWith(`/admin/seo/${createdId}`));
  page.rerender(<Page id={createdId} />);
  await waitFor(() => expect(input("Path").value).toBe("/canonical"));
  if (reopen === "reload") {
    page.unmount();
    render(<Page />);
  } else page.rerender(<Page />);
  await screen.findByRole("textbox", { name: "Path" });
  for (const name of ["Path", "SEO title override", "SEO description override"])
    expect(input(name).value).toBe("");
  expect(posts()).toHaveLength(1);
});

it("resumes unfinished New work after navigation and reload", async () => {
  const page = render(<Page />);
  await fill();
  change("SEO description override", "Unfinished description");
  page.rerender(<Page list />);
  page.rerender(<Page />);
  await screen.findByRole("textbox", { name: "Path" });
  expect(input("Path").value).toBe("/submitted/");
  expect(input("SEO title override").value).toBe("Submitted");
  page.unmount();
  render(<Page />);
  await screen.findByRole("textbox", { name: "Path" });
  expect(input("Path").value).toBe("/submitted/");
  expect(input("SEO title override").value).toBe("Submitted");
  expect(input("SEO description override").value).toBe("Unfinished description");
  expect(posts()).toHaveLength(0);
});

it("blocks duplicate submits and waits for the canonical response before navigating", async () => {
  let finish!: () => void;
  post = (value) => new Promise((resolve) => { finish = () => resolve(Response.json({ ...value, id: createdId }, { status: 201 })); });
  render(<Page />); await fill(); save(); save();
  await waitFor(() => expect(posts()).toHaveLength(1));
  expect(replace).not.toHaveBeenCalled();
  for (const name of ["Path", "SEO title override", "SEO description override"])
    expect(input(name).matches(":disabled")).toBe(true);
  change("Path", "/blocked");
  expect(input("Path").value).toBe("/submitted/");
  expect(screen.getByRole("button", { name: "Discard changes" }).hasAttribute("disabled")).toBe(true);
  await act(async () => finish());
  await waitFor(() => expect(replace).toHaveBeenCalledOnce());
  save(); expect(posts()).toHaveLength(1);
});

it.each([401, 403, 409, 422, 500])("retains input and permits correction after POST returns %s", async (status) => {
  post = async () => Response.json({ error: { code: status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : status === 409 ? "CONFLICT" : status === 422 ? "VALIDATION_ERROR" : "INTERNAL_ERROR", message: "Create failed", issues: [{ pointer: "/path", message: "Choose another path" }] } }, { status });
  render(<Page />); await fill(); save();
  await screen.findByRole("alert");
  await waitFor(() => expect(document.activeElement).toBe(input("Path")));
  expect(input("Path").value).toBe("/submitted/");
  for (const name of ["Path", "SEO title override", "SEO description override"])
    expect(input(name).matches(":disabled")).toBe(false);
  expect(replace).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Save changes" }).hasAttribute("disabled")).toBe(false);
  change("Path", "/corrected");
  expect(screen.queryByRole("alert")).toBeNull();
  save(); await waitFor(() => expect(posts()).toHaveLength(2));
});

it.each(["network", "invalid-response"])("retains input without reposting or navigating for %s", async (failure) => {
  post = async () => {
    if (failure === "network") throw new TypeError("Response lost");
    return Response.json({ id: "new", path: "/submitted", title: "Submitted", description: "" }, { status: 201 });
  };
  const page = render(<Page />); await fill(); save();
  expect(await screen.findByText("Couldn’t confirm the save.")).toBeTruthy();
  expect(input("Path").value).toBe("/submitted/");
  expect(posts()).toHaveLength(1);
  expect(replace).not.toHaveBeenCalled();
  page.unmount();
  render(<Page />);
  await screen.findByRole("textbox", { name: "Path" });
  expect(input("Path").value).toBe("/submitted/");
  expect(input("SEO title override").value).toBe("Submitted");
  expect(posts()).toHaveLength(1);
});

it("loads saved context with the shared text-free spinner and refuses fixture fallback", async () => {
  let finish!: () => void;
  fetch.mockImplementation(() => new Promise((resolve) => { finish = () => resolve(Response.json([], { status: 200 })); }));
  render(<Page />);
  expect(screen.getByRole("status", { name: "Loading SEO content" }).textContent).toBe("");
  expect(screen.queryByRole("textbox")).toBeNull();
  await act(async () => finish());
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByRole("textbox")).toBeNull();
});

it("does not navigate or rewrite a newer New draft when creation finishes after unmount", async () => {
  let finish!: () => void;
  post = (value) => new Promise((resolve) => { finish = () => resolve(Response.json({ ...value, id: createdId }, { status: 201 })); });
  const page = render(<Page />); await fill(); save();
  await waitFor(() => expect(posts()).toHaveLength(1)); page.unmount();
  const later = render(<Page />); await screen.findByRole("textbox", { name: "Path" });
  change("SEO title override", "Newer session"); later.unmount();
  await act(async () => finish());
  expect(replace).not.toHaveBeenCalled();
  expect(JSON.parse(localStorage.getItem("portfolio:cms-drafts:v1:seo:new")!).value.title).toBe("Newer session");
});
