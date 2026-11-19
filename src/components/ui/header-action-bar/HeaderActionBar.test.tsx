import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRef } from "react";

const { back, push } = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back, push }) }));

import { HeaderActionBar } from "./HeaderActionBar";

function setCanGoBack(value: boolean | undefined) {
  Object.defineProperty(window, "navigation", {
    configurable: true,
    value: value === undefined ? undefined : { canGoBack: value },
  });
}

describe("HeaderActionBar", () => {
  beforeEach(() => {
    back.mockReset();
    push.mockReset();
  });
  afterEach(() => setCanGoBack(undefined));

  it("steps back to the previous app page by default", () => {
    setCanGoBack(true);
    render(<HeaderActionBar />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("goes to the fallback route when no earlier app page exists", () => {
    setCanGoBack(false);
    const { rerender } = render(<HeaderActionBar />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(push).toHaveBeenLastCalledWith("/");
    rerender(<HeaderActionBar fallbackHref="/work" />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(push).toHaveBeenLastCalledWith("/work");
    expect(back).not.toHaveBeenCalled();
  });

  it("leaves navigation to an explicit onBack", () => {
    setCanGoBack(true);
    const onBack = vi.fn();
    render(<HeaderActionBar onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(back).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("exposes the back button for focus restoration and respects a disabled back action", () => {
    const backButtonRef = createRef<HTMLButtonElement>();
    const onBack = vi.fn();
    const { rerender } = render(<HeaderActionBar onBack={onBack} backLabel="Return to editor" backButtonRef={backButtonRef} backDisabled />);
    const back = screen.getByRole("button", { name: "Return to editor" });
    expect(backButtonRef.current).toBe(back);
    fireEvent.click(back);
    expect(onBack).not.toHaveBeenCalled();
    rerender(<HeaderActionBar onBack={onBack} backLabel="Return to editor" backButtonRef={backButtonRef} />);
    act(() => backButtonRef.current?.focus());
    expect(document.activeElement).toBe(back);
    fireEvent.click(back);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
  it("keeps the back action available when middle content is omitted", () => {
    const onBack = vi.fn();

    render(<HeaderActionBar backLabel="Back to work" onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: "Back to work" }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("renders optional middle content and trailing actions", () => {
    render(
      <HeaderActionBar
        actions={<button type="button">Share</button>}
        onBack={vi.fn()}
      >
        <h1>Project details</h1>
      </HeaderActionBar>,
    );

    expect(screen.getByRole("heading", { name: "Project details" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Share" })).toBeTruthy();
  });
});
