import { render, screen } from "@testing-library/react";
import {
  forwardRef,
  useImperativeHandle,
  type HTMLAttributes,
  type PropsWithChildren,
} from "react";
import { describe, expect, it, vi } from "vitest";

import type {
  PrismHeroLayoutHandle,
  PrismHeroLayoutProps,
} from "@/src/components/prism-fiber/ui/hero/PrismHeroLayout";

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();

  return {
    ...motion,
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
  it("renders the complete hero with page-owned camera zoom", () => {
    render(<PrismHeroLayoutLab />);

    const heroes = screen.getAllByTestId("prism-hero");
    expect(heroes).toHaveLength(1);
    expect(heroes[0].getAttribute("data-allows-camera-zoom")).toBe("false");
    expect(
      screen.getByRole("heading", { level: 1, name: "Ideas into products." }),
    ).toBeTruthy();
  });

  it("places one decorative glass panel after the hero runway", () => {
    render(<PrismHeroLayoutLab />);

    const runway = screen.getByTestId("prism-scroll-runway");
    const panel = screen.getByTestId("prism-glass-panel");

    expect(runway.nextElementSibling).toBe(panel);
    expect(panel.getAttribute("aria-hidden")).toBe("true");
    expect(panel.getAttribute("data-material")).toBe("glass");
    expect(panel.className).toContain("pointer-events-none");
    expect(panel.style.transform).toBe("");
  });
});
