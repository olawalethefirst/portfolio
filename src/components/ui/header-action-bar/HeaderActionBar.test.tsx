import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HeaderActionBar } from "./HeaderActionBar";

describe("HeaderActionBar", () => {
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
