import { act, render, renderHook, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AppearanceProvider, useAppearance } from "./AppearanceProvider";
import type { AppearanceChoice } from "./appearance";

beforeEach(() => {
  for (const name of ["portfolio-theme", "portfolio-mode"])
    document.cookie = `${name}=; path=/; max-age=0`;
  document.documentElement.dataset.theme = "chartreuse";
  document.documentElement.dataset.mode = "dark";
});
afterEach(() => vi.unstubAllGlobals());

const wrap = (initial?: AppearanceChoice) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <AppearanceProvider initial={initial}>{children}</AppearanceProvider>;
  };

/** A controllable prefers-color-scheme: light query. */
function stubDevice(initiallyLight: boolean) {
  let matches = initiallyLight;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return matches;
    },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }));
  return {
    switchTo(light: boolean) {
      matches = light;
      listeners.forEach((listener) => listener());
    },
    listenerCount: () => listeners.size,
  };
}

it("resolves the dark default when nothing was chosen and the device has no preference", () => {
  const { result } = renderHook(() => useAppearance(), { wrapper: wrap() });
  expect(result.current).toMatchObject({ theme: "chartreuse", mode: "dark" });
});

it("starts from the choices the server read, per dimension", () => {
  const { result } = renderHook(() => useAppearance(), { wrapper: wrap({ theme: "forest" }) });
  expect(result.current).toMatchObject({ theme: "forest", mode: "dark" });
});

it("follows a light device until the visitor chooses a mode", () => {
  const device = stubDevice(true);
  const { result } = renderHook(() => useAppearance(), { wrapper: wrap() });
  expect(result.current.mode).toBe("light");
  expect(document.documentElement.dataset.mode).toBe("light");
  act(() => device.switchTo(false));
  expect(result.current.mode).toBe("dark");
  expect(document.documentElement.dataset.mode).toBe("dark");
  act(() => result.current.setMode("light"));
  expect(device.listenerCount()).toBe(0);
  act(() => device.switchTo(false));
  expect(result.current.mode).toBe("light");
  expect(document.cookie).toContain("portfolio-mode=light");
});

it("ignores the device when the server read a saved mode", () => {
  const device = stubDevice(true);
  const { result } = renderHook(() => useAppearance(), { wrapper: wrap({ mode: "dark" }) });
  expect(result.current.mode).toBe("dark");
  expect(device.listenerCount()).toBe(0);
});

it("writes each choice to its cookie and <html>, and updates every reader", () => {
  function Readers() {
    const { theme, mode, setTheme, setMode } = useAppearance();
    return (
      <>
        <output>{`${theme}/${mode}`}</output>
        <button onClick={() => { setTheme("copper"); setMode("light"); }}>choose</button>
      </>
    );
  }
  function Other() {
    return <span>{useAppearance().theme}</span>;
  }
  render(<AppearanceProvider><Readers /><Other /></AppearanceProvider>);
  expect(screen.getByText("chartreuse/dark")).toBeTruthy();
  act(() => screen.getByRole("button", { name: "choose" }).click());
  expect(screen.getByText("copper/light")).toBeTruthy();
  expect(screen.getByText("copper")).toBeTruthy();
  expect(document.cookie).toContain("portfolio-theme=copper");
  expect(document.cookie).toContain("portfolio-mode=light");
  expect(document.documentElement.dataset.theme).toBe("copper");
  expect(document.documentElement.dataset.mode).toBe("light");
});

it("re-applies the applied values to <html> after something clears them", () => {
  const { unmount } = renderHook(() => useAppearance(), { wrapper: wrap({ theme: "plum", mode: "light" }) });
  expect(document.documentElement.dataset.theme).toBe("plum");
  unmount();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.mode;
  renderHook(() => useAppearance(), { wrapper: wrap({ theme: "plum", mode: "light" }) });
  expect(document.documentElement.dataset.theme).toBe("plum");
  expect(document.documentElement.dataset.mode).toBe("light");
});

it("keeps a stable value between unrelated renders", () => {
  const { result, rerender } = renderHook(() => useAppearance(), { wrapper: wrap() });
  const first = result.current;
  rerender();
  expect(result.current).toBe(first);
});

it("renders the seeded choices, else the defaults, in server markup", () => {
  function Reader() {
    const { theme, mode } = useAppearance();
    return <span>{`${theme}/${mode}`}</span>;
  }
  expect(renderToString(<AppearanceProvider initial={{ theme: "copper", mode: "light" }}><Reader /></AppearanceProvider>)).toContain("copper/light");
  expect(renderToString(<Reader />)).toContain("chartreuse/dark");
});

it("is read-only outside a provider", () => {
  const { result } = renderHook(() => useAppearance());
  act(() => result.current.setMode("light"));
  expect(result.current.mode).toBe("dark");
  expect(document.documentElement.dataset.mode).toBe("dark");
});
