import { fireEvent, render as baseRender, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import {
  forwardRef,
  useImperativeHandle,
  type HTMLAttributes,
  type PropsWithChildren,
} from "react";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  PrismHeroLayoutHandle,
  PrismHeroLayoutProps,
} from "@/src/components/prism-fiber/ui/hero/PrismHeroLayout";

vi.mock("./theme-accents", () => ({
  themes: ["plum"],
  useThemeAccents: () => ({ plum: "#774477" }),
  themeForAccent: () => "plum",
}));

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterAll(() => vi.unstubAllGlobals());

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();

  return {
    ...motion,
    useInView: () => true,
    useReducedMotion: () => false,
  };
});

vi.mock("@/src/components/prism-fiber/ui/hero/PrismHeroLayout", () => ({
  PrismHeroLayout: forwardRef<PrismHeroLayoutHandle, PrismHeroLayoutProps>(
    function PrismHeroLayoutMock({ allowsCameraZoom, content }, ref) {
      useImperativeHandle(ref, () => ({ setDiscoveryProgress: vi.fn() }));

      return (
        <div
          data-allows-camera-zoom={String(allowsCameraZoom)}
          data-testid="prism-hero"
        >
          <h1>{content.headline}</h1>
        </div>
      );
    },
  ),
}));

vi.mock("@/src/components/project-item/ProjectDeviceStage", () => ({
  ProjectDeviceStage: () => null,
}));

vi.mock("@/src/components/ui/Surface", () => ({
  Surface: ({
    children,
    className,
    material,
    ...props
  }: PropsWithChildren<
    HTMLAttributes<HTMLDivElement> & { material?: string }
  >) => (
    <div {...props} className={className} data-material={material}>
      {children}
    </div>
  ),
}));

import { initialAbout } from "@/src/cms/about";
import type { PublishedProject } from "@/src/cms/projects";
import type { PublishedPublication } from "@/src/cms/publications";
import { PRISM_HERO_DEFAULT_CONTENT } from "@/src/components/prism-fiber/ui/hero/prism-hero-content";
import { PrismHeroLayoutLab } from "./PrismHeroLayoutLab";
import { appearanceHarness } from "@/src/theme/test-support/appearanceHarness";

const publishedPublications: PublishedPublication[] = [
  {
    id: "designing-for-trust",
    title: "Designing for trust",
    summary: "A practical framework for legible decisions.",
    bodyMarkdown: "Body",
    coverSrc: "/media/cover-asset",
    coverAlt: "Layered geometric forms",
    tagsText: "Product strategy, Research",
    publishedOn: "2026-09-18",
  },
];

const publishedProjects: PublishedProject[] = [
  {
    id: "field-notes",
    name: "Field Notes",
    summary: "A calmer way for distributed teams to capture decisions.",
    what: "What it does.",
    how: "How it works.",
    platform: "mobile",
    tagsText: "Tag one, Tag two",
    screenshot: "/media/field-notes-asset",
    screenshotAlt: "Field Notes screenshot",
    liveUrl: "https://example.com/field-notes",
  },
  {
    id: "relay",
    name: "Relay",
    summary: "A shared operations workspace.",
    what: "What it does.",
    how: "How it works.",
    platform: "web",
    tagsText: "Tag one, Tag two",
    screenshot: "",
    screenshotAlt: "",
    liveUrl: "https://example.com/relay",
  },
];

describe("PrismHeroLayoutLab", () => {
  let wrapper: ReturnType<typeof appearanceHarness>["Wrapper"];
  const render = (ui: ReactElement) => baseRender(ui, { wrapper });
  it("renders the saved About heading and biography with the existing contact CTA", () => {
    render(
      <PrismHeroLayoutLab
        content={PRISM_HERO_DEFAULT_CONTENT}
        about={{
          heading: "Meet the maker",
          biography: "Saved server biography.",
        }}
        projects={[]}
        publications={[]}
      />,
    );
    const about = screen.getByRole("region", { name: "Meet the maker" });
    // The scroll reveal splits the biography into spans, so match its text content.
    expect(about.textContent).toContain("Saved server biography.");
    expect(
      within(about)
        .getByRole("link", { name: "Start a conversation" })
        .getAttribute("href"),
    ).toBe("/contact");
  });
  it("forwards server-loaded Hero copy into the interactive layout", () => {
    render(
      <PrismHeroLayoutLab
        about={initialAbout}
        content={{
          ...PRISM_HERO_DEFAULT_CONTENT,
          headline: "Server supplied headline",
        }}
        projects={[]}
        publications={[]}
      />,
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Server supplied headline",
      }),
    ).toBeTruthy();
  });
  beforeEach(() => {
    wrapper = appearanceHarness({ theme: "plum", mode: "dark" }).Wrapper;
  });
  it("provides navigation and working display settings within the glass content", () => {
    render(
      <PrismHeroLayoutLab
        about={initialAbout}
        content={PRISM_HERO_DEFAULT_CONTENT}
        projects={[]}
        publications={[]}
      />,
    );

    const panel = screen.getByTestId("prism-glass-panel");
    expect(within(panel).getByRole("button", { name: "Menu" })).toBeTruthy();
    fireEvent.click(within(panel).getByRole("button", { name: "Settings" }));
    fireEvent.click(within(panel).getByRole("switch", { name: "Dark mode" }));
    const themeScope = panel.closest("[data-mode][data-theme]");
    expect(themeScope?.getAttribute("data-mode")).toBe("light");
    expect(themeScope?.getAttribute("data-theme")).toBe("plum");
    expect(themeScope?.contains(screen.getByTestId("prism-hero"))).toBe(true);
    expect(
      screen.getByTestId("prism-hero").closest("[data-mode][data-theme]"),
    ).toBe(themeScope);
  });

  it("renders the complete hero with page-owned camera zoom", () => {
    render(
      <PrismHeroLayoutLab
        about={initialAbout}
        content={PRISM_HERO_DEFAULT_CONTENT}
        projects={[]}
        publications={[]}
      />,
    );

    const heroes = screen.getAllByTestId("prism-hero");
    expect(heroes).toHaveLength(1);
    expect(heroes[0].getAttribute("data-allows-camera-zoom")).toBe("false");
    expect(
      screen.getByRole("heading", { level: 1, name: "Ideas into products." }),
    ).toBeTruthy();
  });

  it("places an accessible project stack in the glass panel after the hero runway", () => {
    render(
      <PrismHeroLayoutLab
        about={initialAbout}
        content={PRISM_HERO_DEFAULT_CONTENT}
        projects={publishedProjects}
        publications={[]}
      />,
    );

    const runway = screen.getByTestId("prism-scroll-runway");
    const panel = screen.getByTestId("prism-glass-panel");

    expect(runway.nextElementSibling).toBe(panel);
    expect(panel.getAttribute("data-material")).toBe("glass");
    expect(panel.style.transform).toBe("");

    const projects = [
      within(panel).getByRole("article", { name: "Field Notes" }),
      within(panel).getByRole("article", { name: "Relay" }),
    ];
    expect(projects).toHaveLength(2);
    expect(
      within(projects[0]).getByRole("heading", { name: "Field Notes" }),
    ).toBeTruthy();
    expect(
      within(projects[1]).getByRole("heading", { name: "Relay" }),
    ).toBeTruthy();
    expect(
      within(projects[0])
        .getByRole("link", { name: "View Field Notes live" })
        .getAttribute("href"),
    ).toBe("https://example.com/field-notes");
    expect(
      within(projects[1])
        .getByRole("link", { name: "View Relay live" })
        .getAttribute("href"),
    ).toBe("https://example.com/relay");
  });

  it("shows no project when none are published", () => {
    render(
      <PrismHeroLayoutLab
        about={initialAbout}
        content={PRISM_HERO_DEFAULT_CONTENT}
        projects={[]}
        publications={[]}
      />,
    );

    expect(screen.queryByRole("article", { name: "Field Notes" })).toBeNull();
    expect(screen.queryByRole("article", { name: "Relay" })).toBeNull();
  });

  it("places an accessible publication stack linking to the real article route", () => {
    render(
      <PrismHeroLayoutLab
        about={initialAbout}
        content={PRISM_HERO_DEFAULT_CONTENT}
        projects={[]}
        publications={publishedPublications}
      />,
    );

    const panel = screen.getByTestId("prism-glass-panel");
    const publication = within(panel).getByRole("article", {
      name: "Designing for trust",
    });
    expect(
      within(publication)
        .getByRole("link", { name: "Read Designing for trust" })
        .getAttribute("href"),
    ).toBe("/publications/designing-for-trust");
  });

  it("shows no publication when none are published", () => {
    render(
      <PrismHeroLayoutLab
        about={initialAbout}
        content={PRISM_HERO_DEFAULT_CONTENT}
        projects={[]}
        publications={[]}
      />,
    );

    expect(
      screen.queryByRole("article", { name: "Designing for trust" }),
    ).toBeNull();
  });
});
