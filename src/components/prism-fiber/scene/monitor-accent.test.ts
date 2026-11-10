import { Texture } from "three";
import { describe, expect, it, vi } from "vitest";
import { createMonitorTextureOwner, recolorMonitorSvg } from "./monitor-accent";

function trackedTexture() {
  const texture = new Texture();
  vi.spyOn(texture, "dispose");
  return texture;
}

it("recolors only exact signature colors from an immutable source", () => {
  const source = '<svg fill="#6C63FF"><path fill="#5D5858"/><path fill="#6c63ff"/></svg>';
  expect(recolorMonitorSvg(source, "#123456")).toBe('<svg fill="#123456"><path fill="#5D5858"/><path fill="#123456"/></svg>');
  expect(recolorMonitorSvg(source, "#abcdef")).toContain('#abcdef');
  expect(() => recolorMonitorSvg(source, "invalid")).toThrow();
});

describe("latest texture ownership", () => {
  it("keeps the latest result and releases stale, replaced and unmounted textures", async () => {
    const pending: ((value: Texture) => void)[] = [];
    const apply = vi.fn();
    const owner = createMonitorTextureOwner(() => new Promise(resolve => pending.push(resolve)), apply, vi.fn());
    const first = trackedTexture(), second = trackedTexture(), third = trackedTexture();
    const a = owner.update("a"), b = owner.update("b");
    pending[1](second); await b;
    pending[0](first); await a;
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenLastCalledWith(second);
    expect(first.dispose).toHaveBeenCalledTimes(1);
    const c = owner.update("c"); pending[2](third); await c;
    expect(second.dispose).toHaveBeenCalledTimes(1);
    owner.dispose(); owner.dispose();
    expect(third.dispose).toHaveBeenCalledTimes(1);
  });
  it("retains last good output on failure and permits retry", async () => {
    const good = trackedTexture();
    const load = vi.fn().mockResolvedValueOnce(good).mockRejectedValueOnce(new Error("load")).mockResolvedValueOnce(trackedTexture());
    const report = vi.fn(), apply = vi.fn();
    const owner = createMonitorTextureOwner(load, apply, report);
    await owner.update("a"); await owner.update("b");
    expect(good.dispose).not.toHaveBeenCalled(); expect(report).toHaveBeenCalledTimes(1);
    await owner.update("c"); expect(apply).toHaveBeenCalledTimes(2);
    owner.dispose();
  });
  it("releases results arriving after unmount", async () => {
    let complete!: (value: Texture) => void;
    const texture = trackedTexture(), apply = vi.fn();
    const owner = createMonitorTextureOwner(() => new Promise(resolve => { complete = resolve; }), apply, vi.fn());
    const request = owner.update("a"); owner.dispose(); complete(texture); await request;
    expect(apply).not.toHaveBeenCalled(); expect(texture.dispose).toHaveBeenCalledTimes(1);
  });
  it("cancels obsolete loads and suppresses their errors after a newer success", async () => {
    let rejectOld!: (error: Error) => void;
    const signals: AbortSignal[] = [];
    const texture = trackedTexture();
    const load = (accent: string, signal: AbortSignal) => {
      signals.push(signal);
      return accent === "a" ? new Promise<typeof texture>((_, reject) => { rejectOld = reject; }) : Promise.resolve(texture);
    };
    const apply = vi.fn(), report = vi.fn();
    const owner = createMonitorTextureOwner(load, apply, report);
    const old = owner.update("a"); await owner.update("b");
    expect(signals[0].aborted).toBe(true);
    rejectOld(new Error("obsolete failure")); await old;
    expect(report).not.toHaveBeenCalled();
    expect(apply).toHaveBeenLastCalledWith(texture);
    owner.dispose(); expect(texture.dispose).toHaveBeenCalledTimes(1);
  });

  it("retains the installed replacement if previous texture cleanup throws", async () => {
    const previous = trackedTexture(), replacement = trackedTexture();
    vi.mocked(previous.dispose).mockImplementation(() => { throw new Error("cleanup failed"); });
    const load = vi.fn().mockResolvedValueOnce(previous).mockResolvedValueOnce(replacement);
    const report = vi.fn(), apply = vi.fn();
    const owner = createMonitorTextureOwner(load, apply, report);
    await owner.update("a"); await owner.update("b");
    expect(apply).toHaveBeenLastCalledWith(replacement);
    expect(replacement.dispose).not.toHaveBeenCalled();
    expect(report).toHaveBeenCalledTimes(1);
    owner.dispose();
    expect(replacement.dispose).toHaveBeenCalledTimes(1);
  });

});
