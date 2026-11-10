import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectExplanation } from "./ProjectExplanation";

function Example() {
  return (
    <>
      <ProjectExplanation
        how="Services coordinate requests and return progress updates."
        name="Relay"
        what="A workspace for coordinating business operations."
      />
      <button>Continue browsing</button>
    </>
  );
}

describe("ProjectExplanation", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("opens each requested answer and toggles closed", async () => {
    render(<Example />);
    const what = screen.getByRole("button", { name: "What? About Relay" });
    const how = screen.getByRole("button", { name: "How? Relay works" });

    fireEvent.click(what);
    expect(await screen.findByRole("dialog", { name: "What — Relay" })).toBeTruthy();
    expect(screen.getByText("A workspace for coordinating business operations.")).toBeTruthy();
    expect(what.getAttribute("aria-expanded")).toBe("true");

    fireEvent.pointerDown(document.body, { button: 0, pointerId: 1, pointerType: "mouse" });
    fireEvent.click(document.body);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(how);
    expect(await screen.findByRole("dialog", { name: "How — Relay" })).toBeTruthy();
    await waitFor(() => expect(screen.getAllByRole("dialog", { hidden: true })).toHaveLength(1));
    expect(screen.getByText("Services coordinate requests and return progress updates.")).toBeTruthy();
    expect(what.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(how);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("dismisses with Escape and restores focus to the trigger", async () => {
    render(<Example />);
    const what = screen.getByRole("button", { name: "What? About Relay" });
    act(() => what.focus());
    fireEvent.click(what);
    const panel = await screen.findByRole("dialog");
    act(() => panel.focus());
    fireEvent.keyDown(panel, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(what));
  });

  it("dismisses through HeroUI outside interaction", async () => {
    render(<Example />);
    fireEvent.click(screen.getByRole("button", { name: "What? About Relay" }));
    await screen.findByRole("dialog");
    fireEvent.pointerDown(document.body, { button: 0, pointerId: 1, pointerType: "mouse" });
    fireEvent.click(document.body);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
