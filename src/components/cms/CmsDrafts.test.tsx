import { AboutProvider } from "@/src/cms/AboutProvider";
import { CmsProvider } from "@/src/cms/CmsProvider";
import { HeroProvider } from "@/src/cms/HeroProvider";
import { ProjectProvider } from "@/src/cms/ProjectProvider";
import { SeoProvider } from "@/src/cms/SeoProvider";
import { SocialProvider } from "@/src/cms/SocialProvider";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AboutEditor } from "./AboutEditor";
import { ContactEditor } from "./ContactEditor";
import { HeroEditor } from "./HeroEditor";
import { ProjectEditor } from "./ProjectEditor";
import { PublicationEditor } from "./PublicationEditor";
import { SeoEditor } from "./SeoEditor";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
beforeEach(() => {
  push.mockReset();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => vi.unstubAllGlobals());
function Providers({ children }: { children: ReactNode }) {
  return <CmsProvider><ProjectProvider><HeroProvider><AboutProvider><SocialProvider><SeoProvider>{children}</SeoProvider></SocialProvider></AboutProvider></HeroProvider></ProjectProvider></CmsProvider>;
}
it.each([
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
] as const)("retains the %s working draft across navigation without confirmation", (_name, editor, field) => {
  const { rerender } = render(<Providers>{editor()}</Providers>);
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
