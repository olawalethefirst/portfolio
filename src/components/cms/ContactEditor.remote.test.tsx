import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";
import { initialSocial, type SocialDraft } from "@/src/cms/social";
import { ContactEditor } from "./ContactEditor";

vi.mock("next/dynamic", () => ({ default: () => () => null }));
let saved: SocialDraft;
let read: () => Promise<Response>;
let put: (value: SocialDraft) => Promise<Response>;
let fetch: ReturnType<typeof vi.fn>;
const key = "portfolio:cms-drafts:v1:social:contact";
beforeEach(() => {
  saved = { ...initialSocial, github: "https://example.com/server" };
  read = async () => Response.json(saved);
  put = async (value) => { saved = value; return Response.json(value); };
  fetch = vi.fn(async (_url: string, options?: RequestInit) => options?.method === "PUT" ? put(JSON.parse(String(options.body))) : read());
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => vi.unstubAllGlobals());
function Page({ accountId = "owner" }: { accountId?: string }) {
  return <CmsQueryProvider accountId={accountId}><ContactEditor /></CmsQueryProvider>;
}
const github = () => screen.getByRole("textbox", { name: "GitHub URL" }) as HTMLInputElement;
const linkedin = () => screen.getByRole("textbox", { name: "LinkedIn URL" }) as HTMLInputElement;
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const loaded = () => screen.findByRole("textbox", { name: "GitHub URL" });
function storeDraft() {
  localStorage.setItem(key, JSON.stringify({ id: "contact", value: { github: "https://example.com/recovered", linkedin: "https://example.com/recovered-linkedin", x: initialSocial.x } }));
}

it("loads real server data, submits JSON and adopts canonical saved content", async () => {
  render(<Page />);
  await loaded();
  expect(github().value).toBe("https://example.com/server");
  fireEvent.change(github(), { target: { value: "https://example.com/submitted" } });
  put = async (value) => { saved = { ...value, github: "https://example.com/canonical" }; return Response.json(saved); };
  click("Save changes");
  await waitFor(() => expect(github().value).toBe("https://example.com/canonical"));
  expect(fetch).toHaveBeenCalledWith("/api/admin/social", expect.objectContaining({ method: "PUT", body: expect.stringContaining("https://example.com/submitted") }));
  expect(screen.getByRole("status", { name: "Contact save status" }).textContent).toBe("No unsaved changes");
  expect(localStorage.getItem(key)).toBeNull();
});

it("combines chosen draft fields with saved defaults and clears alternatives after Save", async () => {
  storeDraft();
  render(<Page />);
  await loaded();
  expect(github().value).toBe(saved.github);
  expect(linkedin().value).toBe(saved.linkedin);
  expect(screen.getByRole("button", { name: "Save changes" }).hasAttribute("disabled")).toBe(true);
  click("Use draft GitHub URL");
  expect(github().value).toBe("https://example.com/recovered");
  click("Use saved GitHub URL");
  expect(github().value).toBe(saved.github);
  click("Use draft LinkedIn URL");
  click("Save changes");
  await waitFor(() => expect(localStorage.getItem(key)).toBeNull());
  expect(saved.github).toBe("https://example.com/server");
  expect(saved.linkedin).toBe("https://example.com/recovered-linkedin");
  expect(screen.queryByRole("button", { name: /Use (draft|saved)/ })).toBeNull();
});

it("maps server field issues in visual focus order and retains unknown issues as general feedback", async () => {
  put = async () => Response.json({ error: { code: "VALIDATION_ERROR", message: "Check content", issues: [
    { pointer: "/linkedin", message: "LinkedIn URL denied" },
    { pointer: "/github", message: "GitHub URL denied" },
    { pointer: "/unknown", message: "Review content" },
  ] } }, { status: 422 });
  render(<Page />);
  await loaded();
  fireEvent.change(github(), { target: { value: "https://example.com/submitted" } });
  click("Save changes");
  await screen.findByText("GitHub URL denied");
  await waitFor(() => expect(document.activeElement).toBe(github()));
  expect(linkedin().getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByRole("alert").textContent).toContain("Review content");
  fireEvent.change(github(), { target: { value: "https://example.com/corrected" } });
  expect(screen.queryByRole("alert")).toBeNull();
  expect(linkedin().getAttribute("aria-invalid")).not.toBe("true");
});

it("retains edits after an unconfirmed Save while refreshing saved content", async () => {
  put = async (value) => { saved = { ...value, github: "https://example.com/remote" }; throw new TypeError("Response lost"); };
  render(<Page />);
  await loaded();
  fireEvent.change(github(), { target: { value: "https://example.com/unconfirmed" } });
  click("Save changes");
  await screen.findByText("Couldn’t confirm the save.");
  await waitFor(() => expect(fetch.mock.calls.filter(([, options]) => options?.method !== "PUT")).toHaveLength(2));
  expect(github().value).toBe("https://example.com/unconfirmed");
  expect(screen.getByRole("alert").textContent).toContain("Couldn’t confirm");
  click("Use saved GitHub URL");
  expect(github().value).toBe("https://example.com/remote");
  click("Use draft GitHub URL");
  expect(github().value).toBe("https://example.com/unconfirmed");
});

it.each([401, 403, 500])("does not substitute demo content when initial reading fails: %s", async (status) => {
  storeDraft();
  read = async () => Response.json({ error: { code: status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : "INTERNAL_ERROR", message: "Load failed" } }, { status });
  render(<Page />);
  await screen.findByRole("alert");
  expect(screen.queryByRole("textbox", { name: "GitHub URL" })).toBeNull();
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
  expect(github().value).toBe("https://example.com/server");
  expect(screen.queryByRole("button", { name: /Use (draft|saved)/ })).toBeNull();
});

it.each([false, true])("cleans up a late save without removing later work: %s", async (laterEdit) => {
  let finish!: () => void;
  put = (value) => new Promise<Response>((resolve) => { finish = () => { saved = value; resolve(Response.json(value)); }; });
  const page = render(<Page />);
  await loaded();
  fireEvent.change(github(), { target: { value: "https://example.com/submitted" } });
  click("Save changes");
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  page.unmount();
  if (laterEdit) {
    const next = render(<Page />);
    await loaded();
    fireEvent.change(github(), { target: { value: "https://example.com/later" } });
    next.unmount();
  }
  await act(async () => finish());
  if (laterEdit) expect(JSON.parse(localStorage.getItem(key)!).value.github).toBe("https://example.com/later");
  else expect(localStorage.getItem(key)).toBeNull();
});

it("shows a load failure under the page header and retries on request", async () => {
  let offline = true;
  read = async () => {
    if (offline) throw new TypeError("offline");
    return Response.json(saved);
  };
  render(<Page />);
  expect((await screen.findByRole("alert")).textContent).toContain("Couldn’t load social profiles");
  expect(screen.getByRole("heading", { level: 1, name: "Contact" })).toBeTruthy();
  offline = false;
  click("Try again");
  await loaded();
  expect(github().value).toBe("https://example.com/server");
});
