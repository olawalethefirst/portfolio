import { fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { LabThemeShell } from "./LabThemeShell";

vi.mock("./theme-accents", () => ({
  themes: ["chartreuse", "copper", "plum", "forest"],
  themeForAccent: (_accents: unknown, color: string) =>
    color === "#445544" ? "forest" : "chartreuse",
  useThemeAccents: () => ({
    chartreuse: "#aabb22",
    copper: "#bb7722",
    forest: "#445544",
    plum: "#774477",
  }),
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("LabThemeShell", () => {
  it("provides the shared navigation pill with the requested initial theme", () => {
    const { container } = render(
      <LabThemeShell initialMode="dark" initialTheme="forest">
        <main>Lab preview</main>
      </LabThemeShell>,
    );

    expect(
      container.querySelector('[data-mode="dark"][data-theme="forest"]'),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Menu" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Settings" })).toBeTruthy();
  });

  it("applies display settings to the full lab preview", () => {
    const { container } = render(
      <LabThemeShell initialMode="dark" initialTheme="forest">
        <main>Lab preview</main>
      </LabThemeShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("switch", { name: "Dark mode" }));

    expect(
      container.querySelector('[data-mode="light"][data-theme="forest"]'),
    ).toBeTruthy();
  });
});
