import { CmsShell } from "./CmsShell";
import type { ReactNode } from "react";
import { useSocialQuery } from "@/src/cms/social-queries";
import { mockSocialApi } from "@/src/cms/test-support/mockSocialApi";
import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";
import { act, fireEvent, render as renderPage, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ContactEditor } from "./ContactEditor";

async function render(ui: ReactNode) {
  const page = renderPage(<CmsQueryProvider accountId="test-owner"><CmsShell>{ui}</CmsShell></CmsQueryProvider>);
  await screen.findByRole("textbox", { name: "GitHub URL" });
  return page;
}

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/admin/publications" }));
beforeEach(() => {
  mockSocialApi();
  push.mockReset();
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("scrollY", 280);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function Saved() { const { data: saved } = useSocialQuery(); return <output aria-label="Saved GitHub">{saved?.github}</output>; }

it("previews working URLs through public social links with direct links without saving or losing values", async () => {
  await render(<><ContactEditor /><Saved /></>);
  const saved = screen.getByLabelText("Saved GitHub").textContent;
  fireEvent.change(screen.getByRole("textbox", { name: "GitHub URL" }), { target: { value: "https://github.com/new-profile" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview contact" }));
  const nav = await screen.findByRole("navigation", { name: "Social links" });
  expect(screen.getByRole("heading", { name: "How would you like to connect?" })).toBeTruthy();
  expect(screen.queryByRole("navigation", { name: "Content navigation" })).toBeNull();
  expect(screen.getByLabelText("Saved GitHub").textContent).toBe(saved);
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Exit preview" }));
  const link = within(nav).getByRole("link", { name: "Visit GitHub profile (opens in a new tab)" });
  expect(link.getAttribute("href")).toBe("https://github.com/new-profile");
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toContain("noopener");
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.keyDown(window, { key: "Escape" });
  expect((screen.getByRole("textbox", { name: "GitHub URL" }) as HTMLInputElement).value).toBe("https://github.com/new-profile");
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Preview contact" }));
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 280, behavior: "instant" });
  expect(push).not.toHaveBeenCalled();
});

it("validates unsafe and blank URLs, keeps invalid previews inert and discards errors to saved values", async () => {
  await render(<><ContactEditor /><Saved /></>);
  const saved = screen.getByLabelText("Saved GitHub").textContent;
  const github = screen.getByRole("textbox", { name: "GitHub URL" });
  fireEvent.change(github, { target: { value: "javascript:alert(1)" } });
  fireEvent.change(screen.getByRole("textbox", { name: "LinkedIn URL" }), { target: { value: "" } });
  fireEvent.change(screen.getByRole("textbox", { name: "X URL" }), { target: { value: "http://x.com/profile" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(document.activeElement).toBe(github));
  expect(github.getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByLabelText("Saved GitHub").textContent).toBe(saved);
  fireEvent.click(screen.getByRole("button", { name: "Preview contact" }));
  const nav = await screen.findByRole("navigation", { name: "Social links" });
  for (const link of within(nav).getAllByRole("link")) {
    expect(link.getAttribute("href")).toBeNull();
    expect(link.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(link);
  }
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByText(/invalid HTTPS URLs/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Exit preview" }));
  expect((screen.getByRole("textbox", { name: "GitHub URL" }) as HTMLInputElement).value).toBe("javascript:alert(1)");
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect((screen.getByRole("textbox", { name: "GitHub URL" }) as HTMLInputElement).value).toBe(saved);
  expect(screen.getByRole("textbox", { name: "GitHub URL" }).getAttribute("aria-invalid")).not.toBe("true");
});

it("locks fields, Preview and Discard during Save and adopts the saved URLs", async () => {
  let finish!: () => void;
  const request = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  mockSocialApi(request);
  await render(<><ContactEditor /><Saved /></>);
  const github = screen.getByRole("textbox", { name: "GitHub URL" });
  fireEvent.change(github, { target: { value: "https://github.com/submitted" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  expect((github as HTMLInputElement).disabled || github.closest("fieldset")?.disabled).toBe(true);
  for (const name of ["Save changes", "Preview contact", "Discard changes"]) {
    expect(screen.getByRole("button", { name }).hasAttribute("disabled")).toBe(true);
  }
  await act(async () => finish());
  await waitFor(() => expect(screen.getByLabelText("Saved GitHub").textContent).toBe("https://github.com/submitted"));
  expect(screen.getByRole("status", { name: "Contact save status" }).textContent).toBe("No unsaved changes");
});

it("preserves URLs through a toolbar failure and retries", async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error("Save failed")).mockResolvedValue(undefined);
  mockSocialApi(request);
  await render(<><ContactEditor /><Saved /></>);
  const saved = screen.getByLabelText("Saved GitHub").textContent;
  fireEvent.change(screen.getByRole("textbox", { name: "GitHub URL" }), { target: { value: "https://github.com/retry" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByLabelText("Saved GitHub").textContent).toBe(saved);
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.getByLabelText("Saved GitHub").textContent).toBe("https://github.com/retry"));
  expect(screen.queryByRole("alert")).toBeNull();
});

it("shows associated URL errors after blur and clears them during correction without exposing untouched fields", async () => {
  await render(<ContactEditor />);
  const github = screen.getByRole("textbox", { name: "GitHub URL" });
  const linkedin = screen.getByRole("textbox", { name: "LinkedIn URL" });
  fireEvent.change(github, { target: { value: "https://user:password@example.com" } });
  fireEvent.change(linkedin, { target: { value: "" } });
  expect(github.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.focus(github);
  fireEvent.blur(github);
  expect(github.getAttribute("aria-invalid")).toBe("true");
  const ids = github.getAttribute("aria-describedby")?.split(" ") ?? [];
  expect(ids.some((id) => document.getElementById(id)?.textContent === "Enter a complete HTTPS profile URL without sign-in credentials.")).toBe(true);
  expect(linkedin.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.change(github, { target: { value: "https://example.com/corrected" } });
  expect(github.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.change(github, { target: { value: "http://example.com" } });
  expect(github.getAttribute("aria-invalid")).toBe("true");
});

it("submits its ARIA form using schema URL acceptance and retains a failed save", async () => {
  const request = vi.fn().mockRejectedValue(new Error("Save failed"));
  mockSocialApi(request);
  await render(<ContactEditor />);
  const github = screen.getByRole("textbox", { name: "GitHub URL" });
  fireEvent.change(github, { target: { value: "  HTTPS://code.example.com/profile  " } });
  const form = github.closest("form");
  expect(form?.noValidate).toBe(true);
  fireEvent.submit(form!);
  await screen.findByRole("alert");
  expect(request).toHaveBeenCalledTimes(1);
  expect((github as HTMLInputElement).value).toBe("HTTPS://code.example.com/profile");
});
