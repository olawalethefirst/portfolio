import { act, render, renderHook, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, expect, it } from "vitest";
import {
  AppearanceProvider,
  defaultAppearanceStore,
  useActiveTheme,
  useAppearance,
} from "./AppearanceProvider";
import { seedAppearance } from "./test-support/seedAppearance";
import { createAppearanceStore } from "./appearance-store";

function clearCookies() {
  for (const name of ["portfolio-theme", "portfolio-mode"])
    document.cookie = `${name}=; path=/; max-age=0`;
}
beforeEach(clearCookies);

const wrap = (initial?: Parameters<typeof createAppearanceStore>[0]) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <AppearanceProvider initial={initial}>{children}</AppearanceProvider>;
  };

it("starts with no explicit choice", () => {
  const { result } = renderHook(() => useAppearance((state) => state), { wrapper: wrap() });
  expect(result.current.theme).toBeUndefined();
  expect(result.current.mode).toBeUndefined();
});

it("starts from the choices the server read", () => {
  const { result } = renderHook(() => useAppearance((state) => state), {
    wrapper: wrap({ theme: "plum", mode: "light" }),
  });
  expect(result.current).toMatchObject({ theme: "plum", mode: "light" });
});

it("writes each choice to its cookie and updates every reader", () => {
  function Readers() {
    const theme = useAppearance((state) => state.theme);
    const mode = useAppearance((state) => state.mode);
    const setTheme = useAppearance((state) => state.setTheme);
    const setMode = useAppearance((state) => state.setMode);
    return (
      <>
        <output>{`${theme ?? "none"}/${mode ?? "none"}`}</output>
        <button onClick={() => { setTheme("copper"); setMode("dark"); }}>choose</button>
      </>
    );
  }
  render(<AppearanceProvider><Readers /></AppearanceProvider>);
  expect(screen.getByText("none/none")).toBeTruthy();
  act(() => screen.getByRole("button", { name: "choose" }).click());
  expect(screen.getByText("copper/dark")).toBeTruthy();
  expect(document.cookie).toContain("portfolio-theme=copper");
  expect(document.cookie).toContain("portfolio-mode=dark");
});

it("renders the server-provided choices in server markup", () => {
  function Reader() {
    const mode = useAppearance((state) => state.mode);
    return <span>{mode ?? "none"}</span>;
  }
  expect(renderToString(<AppearanceProvider initial={{ mode: "light" }}><Reader /></AppearanceProvider>)).toContain("light");
  document.cookie = "portfolio-mode=dark; path=/";
  expect(renderToString(<AppearanceProvider><Reader /></AppearanceProvider>)).toContain("none");
});

it("works without a provider, using the shared default store", () => {
  seedAppearance();
  const { result } = renderHook(() => useActiveTheme());
  expect(result.current).toEqual({ theme: "chartreuse", mode: "light" });
  act(() => defaultAppearanceStore.getState().setMode("dark"));
  expect(result.current).toEqual({ theme: "chartreuse", mode: "dark" });
  seedAppearance();
});

it("resolves the applied theme from the choice, else the defaults", () => {
  const { result } = renderHook(() => useActiveTheme(), { wrapper: wrap({ theme: "forest" }) });
  expect(result.current).toEqual({ theme: "forest", mode: "light" });
});

it("applies each choice to <html> as well as the cookie", () => {
  const { result } = renderHook(() => useAppearance((state) => state), { wrapper: wrap() });
  act(() => {
    result.current.setTheme("plum");
    result.current.setMode("dark");
  });
  expect(document.documentElement.dataset.theme).toBe("plum");
  expect(document.documentElement.dataset.mode).toBe("dark");
  seedAppearance();
});

it("renders the documented server default when nothing was chosen", () => {
  function Reader() {
    const { theme, mode } = useActiveTheme();
    return <span>{`${theme}/${mode}`}</span>;
  }
  expect(renderToString(<Reader />)).toContain("chartreuse/light");
  expect(renderToString(<AppearanceProvider initial={{ theme: "copper", mode: "dark" }}><Reader /></AppearanceProvider>)).toContain("copper/dark");
});
