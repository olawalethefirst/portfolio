import { CmsShell } from "./CmsShell";
import type { ReactNode } from "react";
import { SocialProvider, useSocial } from "@/src/cms/SocialProvider";
import { act, fireEvent, render as renderPage, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ContactEditor } from "./ContactEditor";

function render(ui: ReactNode) { return renderPage(ui, { wrapper: CmsShell }); }

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/admin/publications" }));
beforeEach(() => {
  push.mockReset();
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("scrollY", 280);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
});
afterEach(() => vi.unstubAllGlobals());
function Saved() { const { saved } = useSocial(); return <output aria-label="Saved GitHub">{saved.github}</output>; }

it("previews working URLs through public social links with direct links without saving or losing values", async () => {
  render(<SocialProvider><ContactEditor /><Saved /></SocialProvider>);
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
  render(<SocialProvider><ContactEditor /><Saved /></SocialProvider>);
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

it("captures the submitted URLs, blocks duplicates and retains newer edits and saved values across remount", async () => {
  let finish!: () => void;
  const request = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  const { rerender } = render(<SocialProvider request={request}><ContactEditor /><Saved /></SocialProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "GitHub URL" }), { target: { value: "https://github.com/submitted" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(request).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Discard changes" }).hasAttribute("disabled")).toBe(true);
  fireEvent.change(screen.getByRole("textbox", { name: "GitHub URL" }), { target: { value: "https://github.com/newer-edit" } });
  await act(async () => finish());
  expect(screen.getByLabelText("Saved GitHub").textContent).toBe("https://github.com/submitted");
  expect(screen.getByRole("status", { name: "Contact save status" }).textContent).toContain("Unsaved changes");
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect((screen.getByRole("textbox", { name: "GitHub URL" }) as HTMLInputElement).value).toBe("https://github.com/submitted");
  rerender(<SocialProvider request={request}><Saved /></SocialProvider>);
  rerender(<SocialProvider request={request}><ContactEditor /><Saved /></SocialProvider>);
  expect((screen.getByRole("textbox", { name: "GitHub URL" }) as HTMLInputElement).value).toBe("https://github.com/submitted");
});

it("preserves URLs through a demo toolbar failure and retries", async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error("Save failed")).mockResolvedValue(undefined);
  render(<SocialProvider request={request}><ContactEditor /><Saved /></SocialProvider>);
  const saved = screen.getByLabelText("Saved GitHub").textContent;
  fireEvent.change(screen.getByRole("textbox", { name: "GitHub URL" }), { target: { value: "https://github.com/retry" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByLabelText("Saved GitHub").textContent).toBe(saved);
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.getByLabelText("Saved GitHub").textContent).toBe("https://github.com/retry"));
  expect(screen.queryByRole("alert")).toBeNull();
});
