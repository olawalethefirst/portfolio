import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createRef } from "react";

import { HeaderActionBar } from "./HeaderActionBar";

describe("HeaderActionBar", () => {
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
