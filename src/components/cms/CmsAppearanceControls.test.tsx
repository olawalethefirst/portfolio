import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CmsAppearanceControls } from "./CmsAppearanceControls";

// jsdom has no Canvas color conversion; exercise the real picker with resolved accents.
vi.mock("@/src/theme/theme-accents", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/src/theme/theme-accents")>(),
  useThemeAccents: () => ({ chartreuse: "#b8cf00", copper: "#b56a3c", plum: "#83507a", forest: "#367052" }),
}));

beforeEach(() => {
  document.documentElement.dataset.theme = "chartreuse";
  document.documentElement.dataset.mode = "light";
  vi.stubGlobal("ResizeObserver", vi.fn(function () {
    return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
  }));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.dataset.theme = "chartreuse";
  document.documentElement.dataset.mode = "light";
});

it("toggles mode without changing the selected tone", () => {
  document.documentElement.dataset.theme = "forest";
  render(<CmsAppearanceControls />);
  fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));
  expect(document.documentElement.dataset.mode).toBe("dark");
  expect(screen.getByRole("button", { name: "Choose tone, current: Forest" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));
  expect(document.documentElement.dataset.mode).toBe("light");
});

it("shows the current tone and applies a selection without changing mode", async () => {
  document.documentElement.dataset.mode = "dark";
  render(<CmsAppearanceControls />);
  const trigger = screen.getByRole("button", { name: "Choose tone, current: Chartreuse" });
  fireEvent.click(trigger);
  const current = await screen.findByRole("option", { name: "Chartreuse" });
  expect(current.getAttribute("aria-selected")).toBe("true");
  expect(screen.getAllByRole("option")).toHaveLength(4);
  fireEvent.click(screen.getByRole("option", { name: "Copper" }));
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  expect(document.documentElement.dataset.theme).toBe("copper");
  expect(document.documentElement.dataset.mode).toBe("dark");
  expect(screen.getByRole("button", { name: "Choose tone, current: Copper" })).toBeTruthy();
});

it("dismisses with Escape and restores focus without changing the tone", async () => {
  render(<CmsAppearanceControls />);
  const trigger = screen.getByRole("button", { name: "Choose tone, current: Chartreuse" });
  act(() => trigger.focus());
  fireEvent.click(trigger);
  const menu = await screen.findByRole("listbox");
  fireEvent.keyDown(menu, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(document.documentElement.dataset.theme).toBe("chartreuse");
});

it("lets keyboard users open, navigate, and select a tone", async () => {
  render(<CmsAppearanceControls />);
  const trigger = screen.getByRole("button", { name: "Choose tone, current: Chartreuse" });
  act(() => trigger.focus());
  fireEvent.keyDown(trigger, { key: "Enter" });
  fireEvent.keyUp(trigger, { key: "Enter" });
  const chartreuse = await screen.findByRole("option", { name: "Chartreuse" });
  // Simulate tab entry and horizontal layout, which jsdom does not calculate.
  screen.getAllByRole("option").forEach((option, index) => {
    vi.spyOn(option, "getBoundingClientRect").mockReturnValue(new DOMRect(index * 28, 0, 24, 24));
  });
  act(() => chartreuse.focus());
  fireEvent.keyDown(chartreuse, { key: "ArrowRight" });
  const copper = screen.getByRole("option", { name: "Copper" });
  await waitFor(() => expect(document.activeElement).toBe(copper));
  fireEvent.keyDown(copper, { key: "Enter" });
  fireEvent.keyUp(copper, { key: "Enter" });
  await waitFor(() => expect(document.documentElement.dataset.theme).toBe("copper"));
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
});
