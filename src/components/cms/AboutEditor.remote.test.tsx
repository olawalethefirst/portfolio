import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";
import { initialAbout, type AboutDraft } from "@/src/cms/about";
import { AboutEditor } from "./AboutEditor";

vi.mock("next/dynamic", () => ({ default: () => () => null }));
let saved: AboutDraft;
let read: () => Promise<Response>;
let put: (value: AboutDraft) => Promise<Response>;
let fetch: ReturnType<typeof vi.fn>;
const key = "portfolio:cms-drafts:v1:about:about";
beforeEach(() => {
  saved = { ...initialAbout, heading: "Server heading" };
  read = async () => Response.json(saved);
  put = async (value) => { saved = value; return Response.json(value); };
  fetch = vi.fn(async (_url: string, options?: RequestInit) => options?.method === "PUT" ? put(JSON.parse(String(options.body))) : read());
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => vi.unstubAllGlobals());
function Page({ accountId = "owner" }: { accountId?: string }) {
  return <CmsQueryProvider accountId={accountId}><AboutEditor /></CmsQueryProvider>;
}
const heading = () => screen.getByRole("textbox", { name: "Heading" }) as HTMLInputElement;
const biography = () => screen.getByRole("textbox", { name: "Biography" }) as HTMLTextAreaElement;
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const loaded = () => screen.findByRole("textbox", { name: "Heading" });
function storeDraft() {
  localStorage.setItem(key, JSON.stringify({ id: "about", value: { heading: "Recovered heading", biography: "Recovered biography" } }));
}

it("loads real server data, submits JSON and adopts canonical saved content", async () => {
  render(<Page />);
  await loaded();
  expect(heading().value).toBe("Server heading");
  fireEvent.change(heading(), { target: { value: "Submitted heading" } });
  put = async (value) => { saved = { ...value, heading: "Canonical heading" }; return Response.json(saved); };
  click("Save changes");
  await waitFor(() => expect(heading().value).toBe("Canonical heading"));
  expect(fetch).toHaveBeenCalledWith("/api/admin/about", expect.objectContaining({ method: "PUT", body: expect.stringContaining("Submitted heading") }));
  expect(screen.getByRole("status", { name: "About save status" }).textContent).toBe("No unsaved changes");
  expect(localStorage.getItem(key)).toBeNull();
});

it("combines chosen draft fields with saved defaults and clears alternatives after Save", async () => {
  storeDraft();
  render(<Page />);
  await loaded();
  expect(heading().value).toBe(saved.heading);
  expect(biography().value).toBe(saved.biography);
  expect(screen.getByRole("button", { name: "Save changes" }).hasAttribute("disabled")).toBe(true);
  click("Use draft Heading");
  expect(heading().value).toBe("Recovered heading");
  click("Use saved Heading");
  expect(heading().value).toBe(saved.heading);
  click("Use draft Biography");
  click("Save changes");
  await waitFor(() => expect(localStorage.getItem(key)).toBeNull());
  expect(saved.heading).toBe("Server heading");
  expect(saved.biography).toBe("Recovered biography");
  expect(screen.queryByRole("button", { name: /Use (draft|saved)/ })).toBeNull();
});

it("maps server field issues in visual focus order and retains unknown issues as general feedback", async () => {
  put = async () => Response.json({ error: { code: "VALIDATION_ERROR", message: "Check content", issues: [
    { pointer: "/biography", message: "Biography denied" },
    { pointer: "/heading", message: "Heading denied" },
    { pointer: "/unknown", message: "Review content" },
  ] } }, { status: 422 });
  render(<Page />);
  await loaded();
  fireEvent.change(heading(), { target: { value: "Submitted" } });
  click("Save changes");
  await screen.findByText("Heading denied");
  await waitFor(() => expect(document.activeElement).toBe(heading()));
  expect(biography().getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByRole("alert").textContent).toContain("Review content");
  fireEvent.change(heading(), { target: { value: "Corrected" } });
  expect(screen.queryByRole("alert")).toBeNull();
  expect(biography().getAttribute("aria-invalid")).not.toBe("true");
});

it("retains edits after an unconfirmed Save while refreshing saved content", async () => {
  put = async (value) => { saved = { ...value, heading: "Remote canonical" }; throw new TypeError("Response lost"); };
  render(<Page />);
  await loaded();
  fireEvent.change(heading(), { target: { value: "Unconfirmed heading" } });
  click("Save changes");
  await screen.findByText("Couldn’t confirm the save.");
  await waitFor(() => expect(fetch.mock.calls.filter(([, options]) => options?.method !== "PUT")).toHaveLength(2));
  expect(heading().value).toBe("Unconfirmed heading");
  expect(screen.getByRole("alert").textContent).toContain("Couldn’t confirm");
  click("Use saved Heading");
  expect(heading().value).toBe("Remote canonical");
  click("Use draft Heading");
  expect(heading().value).toBe("Unconfirmed heading");
});

it.each([401, 403, 500])("does not substitute demo content when initial reading fails: %s", async (status) => {
  storeDraft();
  read = async () => Response.json({ error: { code: status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : "INTERNAL_ERROR", message: "Load failed" } }, { status });
  render(<Page />);
  await screen.findByRole("alert");
  expect(screen.queryByRole("textbox", { name: "Heading" })).toBeNull();
  expect(localStorage.getItem(key)).not.toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("can discard unselected recovery alternatives and reload without restoring them", async () => {
  storeDraft();
  const page = render(<Page />);
  await loaded();
  click("Discard changes");
  expect(localStorage.getItem(key)).toBeNull();
  page.unmount();
  render(<Page />);
  await loaded();
  expect(heading().value).toBe("Server heading");
  expect(screen.queryByRole("button", { name: /Use (draft|saved)/ })).toBeNull();
});

it.each([false, true])("cleans up a late save without removing later work: %s", async (laterEdit) => {
  let finish!: () => void;
  put = (value) => new Promise<Response>((resolve) => { finish = () => { saved = value; resolve(Response.json(value)); }; });
  const page = render(<Page />);
  await loaded();
  fireEvent.change(heading(), { target: { value: "Submitted" } });
  click("Save changes");
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  page.unmount();
  if (laterEdit) {
    const next = render(<Page />);
    await loaded();
    fireEvent.change(heading(), { target: { value: "Later edit" } });
    next.unmount();
  }
  await act(async () => finish());
  if (laterEdit) expect(JSON.parse(localStorage.getItem(key)!).value.heading).toBe("Later edit");
  else expect(localStorage.getItem(key)).toBeNull();
});

it("shows a load failure under the page header and retries on request", async () => {
  let offline = true;
  read = async () => {
    if (offline) throw new TypeError("offline");
    return Response.json(saved);
  };
  render(<Page />);
  expect((await screen.findByRole("alert")).textContent).toContain("Couldn’t load About");
  expect(screen.getByRole("heading", { level: 1, name: "About" })).toBeTruthy();
  offline = false;
  click("Try again");
  await loaded();
  expect(heading().value).toBe("Server heading");
});
