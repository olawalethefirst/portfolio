/** Resolve a color batch using one temporary probe and one sRGB Canvas. */
export function cssColorsToHex(colors: readonly string[]): string[] {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");
  const probe = document.createElement("span");
  probe.style.display = "none";
  document.documentElement.append(probe);
  try {
    return colors.map(color => {
      if (!CSS.supports("color", color)) throw new Error(`Unsupported CSS color: ${color}`);
      probe.style.color = color;
      const resolved = getComputedStyle(probe).color;
      // Two sentinels distinguish rejected assignments from a valid matching color.
      context.fillStyle = "#010203";
      context.fillStyle = resolved;
      const first = context.fillStyle;
      context.fillStyle = "#040506";
      context.fillStyle = resolved;
      if (context.fillStyle !== first) throw new Error(`Canvas cannot parse color: ${resolved}`);
      context.clearRect(0, 0, 1, 1);
      context.fillRect(0, 0, 1, 1);
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
      return `#${[r, g, b].map(value => value.toString(16).padStart(2, "0")).join("")}`;
    });
  } finally { probe.remove(); }
}

export function cssColorToHex(color: string): string {
  return cssColorsToHex([color])[0];
}
