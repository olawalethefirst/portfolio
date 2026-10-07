import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadMonitorAccent } from "./monitor-accent";

class ControlledImage {
  static instances: ControlledImage[] = [];
  onload: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  src = "";
  constructor() { ControlledImage.instances.push(this); }
}
const revoke = vi.fn();
beforeEach(() => {
  ControlledImage.instances = [];
  revoke.mockClear();
  vi.stubGlobal("Image", ControlledImage);
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:monitor"), revokeObjectURL: revoke });
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => '<svg fill="#6C63FF"/>' })));
});
afterEach(() => vi.unstubAllGlobals());

async function imageForRequest() {
  await vi.waitFor(() => expect(ControlledImage.instances).toHaveLength(1));
  return ControlledImage.instances[0];
}

it("creates no object URL for a request cancelled before source resolution", async () => {
  const abort = new AbortController(); abort.abort();
  await expect(loadMonitorAccent("#123456", abort.signal)).rejects.toThrow();
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
it("releases URL and image handlers after successful decoding", async () => {
  const abort = new AbortController();
  const request = loadMonitorAccent("#123456", abort.signal);
  const image = await imageForRequest(); image.onload?.(new Event("load"));
  const texture = await request;
  expect(texture.image).toBe(image);
  expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:monitor");
  expect(image.onload).toBeNull(); expect(image.onerror).toBeNull();
  abort.abort(); expect(image.src).toBe("blob:monitor");
  texture.dispose();
});
it("releases URL and image handlers on decoding failure", async () => {
  const request = loadMonitorAccent("#123456", new AbortController().signal);
  const rejection = expect(request).rejects.toThrow("failed to decode");
  const image = await imageForRequest(); image.onerror?.(new Event("error"));
  await rejection;
  expect(revoke).toHaveBeenCalledTimes(1);
  expect(image.onload).toBeNull(); expect(image.onerror).toBeNull();
});
it("cancels pending decoding and releases its URL and handlers", async () => {
  const abort = new AbortController();
  const request = loadMonitorAccent("#123456", abort.signal);
  const rejection = expect(request).rejects.toThrow("cancelled");
  const image = await imageForRequest(); abort.abort(); await rejection;
  expect(image.src).toBe(""); expect(image.onload).toBeNull(); expect(image.onerror).toBeNull();
  expect(revoke).toHaveBeenCalledTimes(1);
});
