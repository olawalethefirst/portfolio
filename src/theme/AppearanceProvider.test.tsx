import { act, render, renderHook, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, expect, it } from "vitest";
import { AppearanceProvider, useAppearance } from "./AppearanceProvider";
import type { AppearanceChoice } from "./appearance";

beforeEach(() => {
  for (const name of ["portfolio-theme", "portfolio-mode"])
    document.cookie = `${name}=; path=/; max-age=0`;
  document.documentElement.dataset.theme = "chartreuse";
  document.documentElement.dataset.mode = "light";
});

const wrap = (initial?: AppearanceChoice) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <AppearanceProvider initial={initial}>{children}</AppearanceProvider>;
  };

it("resolves the defaults when nothing was chosen", () => {
  const { result } = renderHook(() => useAppearance(), { wrapper: wrap() });
  expect(result.current).toMatchObject({ theme: "chartreuse", mode: "light" });
});

it("starts from the choices the server read, per dimension", () => {
  const { result } = renderHook(() => useAppearance(), { wrapper: wrap({ theme: "forest" }) });
  expect(result.current).toMatchObject({ theme: "forest", mode: "light" });
});

it("writes each choice to its cookie and <html>, and updates every reader", () => {
  function Readers() {
    const { theme, mode, setTheme, setMode } = useAppearance();
    return (
      <>
        <output>{`${theme}/${mode}`}</output>
        <button onClick={() => { setTheme("copper"); setMode("dark"); }}>choose</button>
      </>
    );
  }
  function Other() {
    return <span>{useAppearance().theme}</span>;
  }
  render(<AppearanceProvider><Readers /><Other /></AppearanceProvider>);
  expect(screen.getByText("chartreuse/light")).toBeTruthy();
  act(() => screen.getByRole("button", { name: "choose" }).click());
  expect(screen.getByText("copper/dark")).toBeTruthy();
  expect(screen.getByText("copper")).toBeTruthy();
  expect(document.cookie).toContain("portfolio-theme=copper");
  expect(document.cookie).toContain("portfolio-mode=dark");
  expect(document.documentElement.dataset.theme).toBe("copper");
  expect(document.documentElement.dataset.mode).toBe("dark");
});

it("keeps a stable value between unrelated renders", () => {
  const { result, rerender } = renderHook(() => useAppearance(), { wrapper: wrap() });
  const first = result.current;
  rerender();
  expect(result.current).toBe(first);
});

it("renders the seeded choices in server markup", () => {
  function Reader() {
    const { theme, mode } = useAppearance();
    return <span>{`${theme}/${mode}`}</span>;
  }
  expect(renderToString(<AppearanceProvider initial={{ theme: "copper", mode: "dark" }}><Reader /></AppearanceProvider>)).toContain("copper/dark");
  expect(renderToString(<Reader />)).toContain("chartreuse/light");
});

it("is read-only outside a provider", () => {
  const { result } = renderHook(() => useAppearance());
  act(() => result.current.setMode("dark"));
  expect(result.current.mode).toBe("light");
  expect(document.documentElement.dataset.mode).toBe("light");
});
