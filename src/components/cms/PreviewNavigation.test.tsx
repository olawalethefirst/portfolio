import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { initialAbout } from "@/src/cms/about";
import { initialPublications } from "@/src/cms/publication-fixtures";
import { initialProjects } from "@/src/cms/projects";
import { initialSocial } from "@/src/cms/social";
import { AboutPreview } from "./AboutPreview";
import { ContactPreview } from "./ContactPreview";
import { ProjectPreview } from "./ProjectPreview";
import { PublicationPreview } from "./PublicationPreview";

vi.mock("@/src/components/project-item/ProjectDeviceStage", () => ({ ProjectDeviceStage: () => null }));
beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", class { observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn(); });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => vi.unstubAllGlobals());
it.each([
  ["About", () => <AboutPreview value={initialAbout} />, "Start a conversation", "/contact"],
  ["Contact", () => <ContactPreview value={initialSocial} />, "Visit GitHub profile (opens in a new tab)", initialSocial.github],
  ["Project", () => <ProjectPreview value={initialProjects()[0].draft} />, "View Field Notes live", initialProjects()[0].draft.liveUrl],
  ["Second publication", () => <PublicationPreview value={initialPublications()[1].draft} mode="card" />, "Read Designing with productive constraints", "/publication-details-lab"],
  ["Publication", () => <PublicationPreview value={initialPublications()[0].draft} mode="card" />, `Read ${initialPublications()[0].draft.title}`, "/publication-details-lab"],
] as const)("lets the browser handle %s preview links", (_name, preview, label, href) => {
  const { container } = render(preview());
  const link = screen.getByRole("link", { name: label });
  expect(link.getAttribute("href")).toBe(href);
  let intercepted: boolean | undefined;
  // Observe the result after React handles the event, then suppress jsdom's navigation.
  container.addEventListener("click", (event) => {
    intercepted = event.defaultPrevented;
    event.preventDefault();
  }, { once: true });
  fireEvent.click(link);
  expect(intercepted).toBe(false);
  expect(fireEvent(link, new MouseEvent("auxclick", { button: 1, bubbles: true, cancelable: true }))).toBe(true);
  expect(screen.queryByRole("dialog")).toBeNull();
});
