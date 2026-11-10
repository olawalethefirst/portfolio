import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

import { setGlobalMode, setGlobalTheme, useActiveTheme } from "./active-theme";

describe("global theme", () => {
  it("renders the documented server default regardless of client attributes", () => {
    document.documentElement.dataset.mode = "dark";
    function Reader() {
      const { theme, mode } = useActiveTheme();
      return <span>{`${theme}/${mode}`}</span>;
    }
    expect(renderToString(<Reader />)).toContain("chartreuse/light");
  });

  beforeEach(() => {
    document.documentElement.dataset.theme = "chartreuse";
    document.documentElement.dataset.mode = "light";
  });

  it("shares selection across readers and consumer remounts", () => {
    const first = renderHook(useActiveTheme);
    const second = renderHook(useActiveTheme);
    act(() => { setGlobalTheme("forest"); setGlobalMode("dark"); });
    expect(first.result.current).toEqual({ theme: "forest", mode: "dark" });
    expect(second.result.current).toBe(first.result.current);
    const snapshot = first.result.current;
    first.rerender();
    expect(first.result.current).toBe(snapshot);
    first.unmount();
    second.unmount();
    const remounted = renderHook(useActiveTheme);
    expect(remounted.result.current).toEqual({ theme: "forest", mode: "dark" });
  });

  it("observes external attribute updates and recovers from invalid values", async () => {
    const { result } = renderHook(useActiveTheme);
    document.documentElement.dataset.mode = "dark";
    await waitFor(() => expect(result.current.mode).toBe("dark"));
    document.documentElement.dataset.theme = "invalid";
    document.documentElement.removeAttribute("data-mode");
    await waitFor(() => expect(result.current).toEqual({ theme: "chartreuse", mode: "light" }));
    document.documentElement.dataset.theme = "plum";
    await waitFor(() => expect(result.current.theme).toBe("plum"));
  });

  it("lets a late reader see external changes without suppressing updates to existing readers", async () => {
    const first = renderHook(useActiveTheme);
    document.documentElement.dataset.theme = "copper";
    const second = renderHook(useActiveTheme);
    expect(second.result.current.theme).toBe("copper");
    await waitFor(() => expect(first.result.current.theme).toBe("copper"));
  });

  it("disconnects its shared observer after the last reader leaves", () => {
    const disconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
    const first = renderHook(useActiveTheme);
    const second = renderHook(useActiveTheme);
    first.unmount();
    expect(disconnect).not.toHaveBeenCalled();
    second.unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
    disconnect.mockRestore();
  });

  it("rejects invalid writes without changing applied attributes", () => {
    // Exercise the runtime boundary without lying about the TypeScript type.
    expect(() => Reflect.apply(setGlobalTheme, null, ["invalid"])).toThrow();
    expect(() => Reflect.apply(setGlobalMode, null, ["invalid"])).toThrow();
    expect(document.documentElement.dataset.theme).toBe("chartreuse");
    expect(document.documentElement.dataset.mode).toBe("light");
  });
});
