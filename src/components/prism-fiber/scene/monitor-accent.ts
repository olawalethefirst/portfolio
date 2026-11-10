import { Texture } from "three";

export function recolorMonitorSvg(source: string, accent: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(accent)) throw new Error("Invalid monitor accent");
  return source.replace(/#6c63ff(?![0-9a-f])/gi, accent);
}

/** Owns ready textures; only the current request may replace the visible image. */
export function createMonitorTextureOwner(
  load: (accent: string, signal: AbortSignal) => Promise<Texture>,
  apply: (texture: Texture) => void,
  report: (error: unknown) => void,
) {
  let generation = 0;
  let disposed = false;
  let current: Texture | undefined;
  let pending: AbortController | undefined;
  return {
    async update(accent: string) {
      if (disposed) return;
      const request = ++generation;
      pending?.abort();
      const abort = new AbortController();
      pending = abort;
      let result: Texture | undefined;
      try {
        result = await load(accent, abort.signal);
        if (disposed || request !== generation) { result.dispose(); return; }
        apply(result);
      } catch (error) {
        result?.dispose();
        if (!disposed && request === generation) report(error);
        return;
      } finally {
        if (pending === abort) pending = undefined;
      }
      const previous = current;
      current = result;
      try { previous?.dispose(); }
      catch (error) { report(error); }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      generation++;
      pending?.abort();
      current?.dispose();
      current = undefined;
    },
  };
}

let originalSvg: Promise<string> | undefined;
function readOriginalSvg() {
  return originalSvg ??= fetch("/prism-assets/monitor-ui.svg").then(response => {
    if (!response.ok) throw new Error(`Monitor SVG load failed: ${response.status}`);
    return response.text();
  }).catch(error => { originalSvg = undefined; throw error; });
}

export async function loadMonitorAccent(accent: string, signal: AbortSignal): Promise<Texture> {
  const svg = recolorMonitorSvg(await readOriginalSvg(), accent);
  signal.throwIfAborted();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        signal.removeEventListener("abort", cancel);
        image.onload = image.onerror = null;
      };
      const cancel = () => {
        cleanup();
        image.src = "";
        reject(new Error("Monitor appearance request cancelled"));
      };
      image.onload = () => { cleanup(); resolve(); };
      image.onerror = () => { cleanup(); reject(new Error("Recolored monitor image failed to decode")); };
      signal.addEventListener("abort", cancel, { once: true });
      image.src = url;
    });
    const texture = new Texture(image);
    texture.needsUpdate = true;
    return texture;
  } finally { URL.revokeObjectURL(url); }
}
