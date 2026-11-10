import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectDeviceStageProps } from "./ProjectDeviceStage";

const motionState = vi.hoisted(() => ({
  isVisible: false,
  reduceMotion: false,
}));
const renderProjectDeviceStage = vi.hoisted(() => vi.fn());

vi.mock("motion/react", () => ({
  useInView: () => motionState.isVisible,
  useReducedMotion: () => motionState.reduceMotion,
}));

vi.mock("./ProjectDeviceStage", () => ({
  ProjectDeviceStage: (props: ProjectDeviceStageProps) => {
    renderProjectDeviceStage(props);

    return (
      <figure aria-label={`${props.name} ${props.platform} project preview`} />
    );
  },
}));

import { ProjectItem } from "./ProjectItem";

describe("ProjectItem", () => {
  beforeEach(() => {
    motionState.isVisible = false;
    motionState.reduceMotion = false;
    renderProjectDeviceStage.mockClear();
  });

  it("presents the complete project preview and live destination", () => {
    render(
      <ProjectItem
        id="field-notes"
        liveHref="https://example.com/field-notes"
        name="Field Notes"
        platform="mobile"
        how="Shared services coordinate team decisions."
        what="A shared decision journal for teams."
        stackIndex={2}
        summary="A calmer way for distributed teams to capture decisions in motion."
      />,
    );

    expect(
      screen.getByRole("article", { name: "Field Notes" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "Field Notes" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "A calmer way for distributed teams to capture decisions in motion.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Mobile")).toBeTruthy();
    expect(screen.getByRole("button", { name: "What? About Field Notes" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "How? Field Notes works" })).toBeTruthy();
    expect(
      screen.getByRole("figure", {
        name: "Field Notes mobile project preview",
      }),
    ).toBeTruthy();

    const liveLink = screen.getByRole("link", {
      name: "View Field Notes live",
    });
    expect(liveLink.getAttribute("href")).toBe(
      "https://example.com/field-notes",
    );
    expect(liveLink.getAttribute("target")).toBe("_blank");
    expect(liveLink.getAttribute("rel")).toBe("noreferrer");
  });

  it("coordinates entry visibility and reduced motion with the device preview", () => {
    const modelEntryRotation = {
      initial: [0, Math.PI / 2, 0] as const,
      visible: [0, 0, 0] as const,
    };
    motionState.isVisible = true;
    motionState.reduceMotion = true;

    render(
      <ProjectItem
        id="field-notes"
        liveHref="https://example.com/field-notes"
        modelEntryRotation={modelEntryRotation}
        name="Field Notes"
        platform="mobile"
        how="Shared services coordinate team decisions."
        what="A shared decision journal for teams."
        stackIndex={2}
        summary="A calmer way to capture decisions."
      />,
    );

    expect(renderProjectDeviceStage).toHaveBeenCalledWith(
      expect.objectContaining({
        isVisible: true,
        modelEntryRotation,
        reduceMotion: true,
      }),
    );
  });
});
