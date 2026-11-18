import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CmsLoadError } from "./CmsLayout";

it("announces the failure as an alert with title and description", () => {
  render(<CmsLoadError title="Couldn’t load X" description="Check your connection." />);
  const alert = screen.getByRole("alert");
  expect(alert.textContent).toContain("Couldn’t load X");
  expect(alert.textContent).toContain("Check your connection.");
  expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
});

it("offers Try again only when a retry is provided", () => {
  const onRetry = vi.fn();
  render(<CmsLoadError title="T" description="D" onRetry={onRetry} />);
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});
