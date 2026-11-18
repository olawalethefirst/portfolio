import { fireEvent, render, screen } from "@testing-library/react";
import { useContext, useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CmsPreviewVisibility, CmsShell } from "./CmsShell";
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/projects/field-notes" }));
beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
});
afterEach(() => vi.unstubAllGlobals());
it("links directly to each content section for prefetchable navigation", () => {
  render(<CmsShell>Collection</CmsShell>);
  const contact = screen.getByRole("link", { name: "Contact" });
  expect(contact.getAttribute("href")).toBe("/admin/contact");
  let intercepted: boolean | undefined;
  contact.addEventListener("click", (event) => { intercepted = event.defaultPrevented; }, { once: true });
  fireEvent.click(contact);
  expect(intercepted).toBe(false);
});

it("derives the active tab from a nested editor route", () => {
  render(<CmsShell>Project editor</CmsShell>);
  expect(screen.getByRole("link", { name: "Projects" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Publications" }).getAttribute("aria-current")).toBeNull();
});

it("keeps the screen mounted, with its local state, when a preview opens and closes", () => {
  function Screen() {
    const setPreview = useContext(CmsPreviewVisibility);
    const [draft, setDraft] = useState("");
    return <>
      <input aria-label="Draft" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <button onClick={() => setPreview?.(true)}>Open preview</button>
      <button onClick={() => setPreview?.(false)}>Close preview</button>
    </>;
  }
  render(<CmsShell><Screen /></CmsShell>);
  fireEvent.change(screen.getByRole("textbox", { name: "Draft" }), { target: { value: "unsaved" } });
  fireEvent.click(screen.getByRole("button", { name: "Open preview" }));
  expect(screen.queryByRole("link", { name: "Projects" })).toBeNull();
  expect((screen.getByRole("textbox", { name: "Draft" }) as HTMLInputElement).value).toBe("unsaved");
  fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
  expect(screen.getByRole("link", { name: "Projects" })).toBeTruthy();
  expect((screen.getByRole("textbox", { name: "Draft" }) as HTMLInputElement).value).toBe("unsaved");
});
