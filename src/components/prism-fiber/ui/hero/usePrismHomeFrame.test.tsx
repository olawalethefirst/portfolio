import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePrismHomeFrame } from "./usePrismHomeFrame";

let notifyResize: (() => void) | undefined;

class ResizeObserverMock {
  constructor(callback: () => void) {
    notifyResize = callback;
  }

  observe() {}
  disconnect() {}
}

function rect(left: number, top: number, width: number, height: number) {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    toJSON: () => undefined,
    top,
    width,
    x: left,
    y: top,
  };
}

function HomeFrameHarness({ onRender }: { onRender?: () => void }) {
  onRender?.();
  const {
    bottomBoundaryRef,
    canvasRef,
    compositionRef,
    homeFrame,
    centersDuringDiscovery,
    initialRegionRef,
    topBoundaryRef,
  } = usePrismHomeFrame();

  return (
    <>
      <div data-region="canvas" ref={canvasRef} />
      <div data-region="composition" ref={compositionRef} />
      <div data-region="initial" ref={initialRegionRef} />
      <div data-region="top" ref={topBoundaryRef} />
      <aside data-region="bottom" ref={bottomBoundaryRef} />
      <output>{JSON.stringify(homeFrame)}</output>
      <output aria-label="Discovery centering">{String(centersDuringDiscovery)}</output>
    </>
  );
}

describe("usePrismHomeFrame", () => {
  it("caps portrait spread, remeasures content, and avoids unchanged renders", () => {
    regions.set("composition", rect(16, 16, 368, 768));
    const onRender = vi.fn();
    const { container } = render(<HomeFrameHarness onRender={onRender} />);
    const composition = container.querySelector<HTMLElement>('[data-region="composition"]')!;
    act(() => {
      composition.style.top = "16px";
      composition.style.bottom = "16px";
      composition.style.left = "16px";
      composition.style.right = "16px";
      composition.style.setProperty("--prism-portrait-spread", "1");
      notifyResize?.();
    });
    const readFrame = () => JSON.parse(container.querySelector("output")!.textContent!);
    const first = readFrame();
    expect(first.width).toBeCloseTo(331.2 / 400);
    expect(first.height).toBeCloseTo(357.696 / 800);
    expect(Number.parseFloat(composition.style.getPropertyValue("--portrait-group-height"))).toBeCloseTo(677.696);
    const renders = onRender.mock.calls.length;
    act(() => notifyResize?.());
    expect(onRender).toHaveBeenCalledTimes(renders);
    regions.set("top", rect(16, 16, 368, 224));
    act(() => notifyResize?.());
    expect(readFrame().top - first.top).toBeCloseTo(20 / 800);
    expect(readFrame().height).toBe(first.height);
    act(() => {
      composition.style.removeProperty("--prism-portrait-spread");
      notifyResize?.();
    });
    expect(readFrame().width).toBeCloseTo(0.9);
  });
  it("enables centering only while the desktop initial region is displayed", () => {
    render(<HomeFrameHarness />);
    const initialRegion = document.querySelector<HTMLElement>('[data-region="initial"]');
    expect(initialRegion).toBeTruthy();
    expect(screen.getByLabelText("Discovery centering").textContent).toBe("true");
    act(() => {
      initialRegion!.style.display = "none";
      notifyResize?.();
    });
    expect(screen.getByLabelText("Discovery centering").textContent).toBe("false");
    act(() => {
      initialRegion!.style.display = "block";
      notifyResize?.();
    });
    expect(screen.getByLabelText("Discovery centering").textContent).toBe("true");
  });
  const regions = new Map([
    ["canvas", rect(0, 0, 400, 800)],
    ["initial", rect(0, 0, 0, 0)],
    ["top", rect(16, 16, 368, 184)],
    ["bottom", rect(16, 680, 368, 104)],
  ]);

  beforeEach(() => {
    notifyResize = undefined;
    regions.set("canvas", rect(0, 0, 400, 800));
    regions.set("initial", rect(0, 0, 0, 0));
    regions.set("top", rect(16, 16, 368, 184));
    regions.set("bottom", rect(16, 680, 368, 104));
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getBoundingClientRect(this: HTMLElement) {
        const name = this.getAttribute("data-region") ?? "";
        const composition = document.querySelector<HTMLElement>('[data-region="composition"]');
        if (composition?.style.getPropertyValue("--prism-portrait-spread") === "1") {
          const height = Number.parseFloat(composition.style.getPropertyValue("--portrait-group-height")) || 768;
          const top = 16 + (768 - height) / 2;
          if (name === "composition") return rect(16, top, 368, height);
          if (name === "top") return rect(16, top, 368, regions.get("top")!.height);
          if (name === "bottom") return rect(16, top + height - regions.get("bottom")!.height, 368, regions.get("bottom")!.height);
        }
        return regions.get(name) ?? rect(0, 0, 0, 0);
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("publishes the UI boundaries as a normalized home frame", () => {
    render(<HomeFrameHarness />);

    const frame = JSON.parse(
      screen.getByText(/"left":0.05/).textContent ?? "null",
    ) as { left: number; top: number; width: number; height: number };

    expect(frame.left).toBeCloseTo(0.05);
    expect(frame.top).toBeCloseTo(0.27);
    expect(frame.width).toBeCloseTo(0.9);
    expect(frame.height).toBeCloseTo(0.56);
  });

  it("updates the home frame when a UI boundary resizes", () => {
    render(<HomeFrameHarness />);

    regions.set("top", rect(16, 16, 368, 224));
    act(() => notifyResize?.());

    const frame = JSON.parse(
      screen.getByText(/"left":0.05/).textContent ?? "null",
    ) as { left: number; top: number; width: number; height: number };

    expect(frame.top).toBeCloseTo(0.32);
    expect(frame.height).toBeCloseTo(0.51);
  });

  it("publishes the right-column region relative to the full Canvas", () => {
    regions.set("canvas", rect(0, 0, 1600, 800));
    regions.set("initial", rect(656, 48, 704, 704));
    regions.set("top", rect(208, 200, 420, 300));
    regions.set("bottom", rect(900, 680, 420, 104));

    render(<HomeFrameHarness />);

    const frame = JSON.parse(
      screen.getByText(/"left":0.41/).textContent ?? "null",
    ) as { left: number; top: number; width: number; height: number };

    expect(frame.left).toBeCloseTo(656 / 1600);
    expect(frame.top).toBe(0);
    expect(frame.width).toBeCloseTo(704 / 1600);
    expect(frame.height).toBe(1);
  });

  it("does not rerender for an unchanged measurement", () => {
    const onRender = vi.fn();
    render(<HomeFrameHarness onRender={onRender} />);
    expect(onRender).toHaveBeenCalledTimes(2);

    act(() => notifyResize?.());

    expect(onRender).toHaveBeenCalledTimes(2);
  });
});
