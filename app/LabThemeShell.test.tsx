import { fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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
  beforeEach(() => {
    document.documentElement.dataset.theme = "forest";
    document.documentElement.dataset.mode = "dark";
  });
  it("provides shared navigation using the existing global theme", () => {
    render(
      <LabThemeShell>
        <main>Lab preview</main>
      </LabThemeShell>,
    );

    expect(
      document.documentElement.matches('[data-mode="dark"][data-theme="forest"]'),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Menu" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Settings" })).toBeTruthy();
  });

  it("links to the home page, contact form, and publication lab", () => {
    render(<LabThemeShell><main>Lab preview</main></LabThemeShell>);

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href"))
      .toBe("/");
    expect(screen.getByRole("link", { name: "Publication details lab" }).getAttribute("href"))
      .toBe("/publication-details-lab");
    expect(screen.getByRole("link", { name: "Contact" }).getAttribute("href"))
      .toBe("/contact");
    expect(screen.queryByRole("link", { name: "Component lab" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Project item lab" })).toBeNull();
  });

  it("applies display settings to the full lab preview", () => {
    render(
      <LabThemeShell>
        <main>Lab preview</main>
      </LabThemeShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("switch", { name: "Dark mode" }));

    expect(
      document.documentElement.matches('[data-mode="light"][data-theme="forest"]'),
    ).toBeTruthy();
  });

  it("writes theme color selection globally without resetting mode", () => {
    render(
      <LabThemeShell><main>Lab preview</main></LabThemeShell>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("option", { name: /Chartreuse/i }));
    expect(document.documentElement.dataset.theme).toBe("chartreuse");
    expect(document.documentElement.dataset.mode).toBe("dark");
  });
});
