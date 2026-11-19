import { render, screen, within } from "@testing-library/react";
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
        tags={["Mobile", "Notes"]}
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
    expect(
      within(screen.getByRole("list", { name: "Topics" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Mobile", "Notes"]);
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
        tags={["Mobile", "Notes"]}
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

  it.each([
    ["mobile", { initial: [0, Math.PI / 2, 0], visible: [0, 0, 0] }],
    ["web", { initial: [0, 0, 0], visible: [0, -Math.PI / 2, 0] }],
  ] as const)("rotates %s projects into view by default", (platform, modelEntryRotation) => {
    render(
      <ProjectItem
        id="project"
        liveHref="https://example.com/project"
        name="Project"
        platform={platform}
        tags={[]}
        how="How it works."
        what="What it is."
        stackIndex={1}
        summary="A summary."
      />,
    );

    expect(renderProjectDeviceStage).toHaveBeenCalledWith(
      expect.objectContaining({ modelEntryRotation }),
    );
  });
});
