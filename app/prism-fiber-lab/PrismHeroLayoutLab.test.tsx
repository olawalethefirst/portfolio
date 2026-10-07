import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  forwardRef,
  useImperativeHandle,
  type HTMLAttributes,
  type PropsWithChildren,
} from "react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  PrismHeroLayoutHandle,
  PrismHeroLayoutProps,
} from "@/src/components/prism-fiber/ui/hero/PrismHeroLayout";

vi.mock("../theme-accents", () => ({
  themes: ["plum"],
  useThemeAccents: () => ({ plum: "#774477" }),
  themeForAccent: () => "plum",
}));

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
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
    function PrismHeroLayoutMock({ allowsCameraZoom }, ref) {
      useImperativeHandle(ref, () => ({ setDiscoveryProgress: vi.fn() }));

      return (
        <div
          data-allows-camera-zoom={String(allowsCameraZoom)}
          data-testid="prism-hero"
        >
          <h1>Ideas into products.</h1>
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

import { PrismHeroLayoutLab } from "./PrismHeroLayoutLab";

describe("PrismHeroLayoutLab", () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = "plum";
    document.documentElement.dataset.mode = "dark";
  });
  it("provides navigation and working display settings within the glass content", () => {
    render(<PrismHeroLayoutLab />);

    const panel = screen.getByTestId("prism-glass-panel");
    expect(within(panel).getByRole("button", { name: "Menu" })).toBeTruthy();
    fireEvent.click(within(panel).getByRole("button", { name: "Settings" }));
    fireEvent.click(within(panel).getByRole("switch", { name: "Dark mode" }));
    const themeScope = panel.closest('[data-mode][data-theme]');
    expect(themeScope?.getAttribute("data-mode")).toBe("light");
    expect(themeScope?.getAttribute("data-theme")).toBe("plum");
    expect(themeScope?.contains(screen.getByTestId("prism-hero"))).toBe(true);
    expect(
      screen.getByTestId("prism-hero").closest('[data-mode][data-theme]'),
    ).toBe(themeScope);
  });

  it("renders the complete hero with page-owned camera zoom", () => {
    render(<PrismHeroLayoutLab />);

    const heroes = screen.getAllByTestId("prism-hero");
    expect(heroes).toHaveLength(1);
    expect(heroes[0].getAttribute("data-allows-camera-zoom")).toBe("false");
    expect(
      screen.getByRole("heading", { level: 1, name: "Ideas into products." }),
    ).toBeTruthy();
  });

  it("places an accessible project stack in the glass panel after the hero runway", () => {
    render(<PrismHeroLayoutLab />);

    const runway = screen.getByTestId("prism-scroll-runway");
    const panel = screen.getByTestId("prism-glass-panel");

    expect(runway.nextElementSibling).toBe(panel);
    expect(panel.getAttribute("data-material")).toBe("glass");
    expect(panel.style.transform).toBe("");

    const projects = within(panel).getAllByRole("article");
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
});
