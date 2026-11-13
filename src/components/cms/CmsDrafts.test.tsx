import { CmsShell } from "./CmsShell";
import { AboutProvider } from "@/src/cms/AboutProvider";
import { CmsProvider } from "@/src/cms/CmsProvider";
import { mockHeroApi } from "@/src/cms/test-support/mockHeroApi";
import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";
import { ProjectProvider } from "@/src/cms/ProjectProvider";
import { SeoProvider } from "@/src/cms/SeoProvider";
import { SocialProvider } from "@/src/cms/SocialProvider";
import { fireEvent, render as renderPage, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AboutEditor } from "./AboutEditor";
import { ContactEditor } from "./ContactEditor";
import { HeroEditor } from "./HeroEditor";
import { ProjectEditor } from "./ProjectEditor";
import { PublicationEditor } from "./PublicationEditor";
import { SeoEditor } from "./SeoEditor";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/admin/publications" }));
beforeEach(() => {
  mockHeroApi();
  push.mockReset();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function Providers({ children }: { children: ReactNode }) {
  return <CmsProvider><ProjectProvider><CmsQueryProvider accountId="test-owner"><AboutProvider><SocialProvider><SeoProvider><CmsShell>{children}</CmsShell></SeoProvider></SocialProvider></AboutProvider></CmsQueryProvider></ProjectProvider></CmsProvider>;
}
async function render(ui: ReactNode) { const page = renderPage(ui); await screen.findAllByRole("textbox"); return page; }
const editors = [
  ["Hero", () => <HeroEditor />, "Headline"],
  ["About", () => <AboutEditor />, "Biography"],
  ["Contact", () => <ContactEditor />, "GitHub URL"],
  ["Project", () => <ProjectEditor id="field-notes" />, "Name"],
  ["New project", () => <ProjectEditor id="new" />, "Name"],
  ["Publication", () => <PublicationEditor id="publication-1" />, "Title"],
  ["New publication", () => <PublicationEditor id="new" />, "Title"],
  ["SEO defaults", () => <SeoEditor id="defaults" />, "Default title"],
  ["SEO override", () => <SeoEditor id="contact" />, "SEO title override"],
  ["New SEO override", () => <SeoEditor id="new" />, "Path"],
] as const;
it.each(editors)("retains the %s working draft across navigation without confirmation", async (_name, editor, field) => {
  const { rerender } = await render(<Providers>{editor()}</Providers>);
  fireEvent.change(screen.getByRole("textbox", { name: field }), { target: { value: "Working draft" } });
  fireEvent.click(screen.getByRole("button", { name: "About" }));
  expect(push).toHaveBeenCalledExactlyOnceWith("/admin/about");
  expect(screen.queryByRole("dialog")).toBeNull();
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(false);
  rerender(<Providers>{null}</Providers>);
  rerender(<Providers>{editor()}</Providers>);
  expect((screen.getByRole("textbox", { name: field }) as HTMLInputElement).value).toBe("Working draft");
});


it.each(editors)("restores the %s working draft after providers remount", async (_name, editor, field) => {
  const first = await render(<Providers>{editor()}</Providers>);
  fireEvent.change(screen.getByRole("textbox", { name: field }), { target: { value: "Recovered after reload" } });
  first.unmount();
  await render(<Providers>{editor()}</Providers>);
  expect((screen.getByRole("textbox", { name: field }) as HTMLInputElement).value).toBe("Recovered after reload");
  expect(screen.getByRole("status", { name: "Local draft status" }).textContent).toBe("Saved on this device.");
});

it("reports a local storage failure while keeping the form editable", async () => {
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage full"); });
  try {
    await render(<Providers><HeroEditor /></Providers>);
    const headline = screen.getByRole("textbox", { name: "Headline" }) as HTMLInputElement;
    fireEvent.change(headline, { target: { value: "Keep my changes" } });
    fireEvent(window, new Event("pagehide"));
    expect(screen.getByRole("alert", { name: "Local draft status" }).textContent).toBe("Couldn’t save on this device. Keep this page open to retain your edits.");
    expect(headline.value).toBe("Keep my changes");
    fireEvent.change(headline, { target: { value: "Still editing" } });
    expect(headline.value).toBe("Still editing");
  } finally {
    write.mockRestore();
  }
});
