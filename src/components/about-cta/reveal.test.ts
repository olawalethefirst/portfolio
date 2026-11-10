import { afterEach, describe, expect, it } from "vitest";

import { createSummaryReveal } from "./reveal";

const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
});

function reveal(text: string) {
  const element = document.createElement("p");
  element.textContent = text;
  document.body.append(element);
  const result = createSummaryReveal(element);
  cleanups.push(() => {
    result.animation.revert();
    result.split.revert();
    element.remove();
  });
  return { element, ...result };
}

function opacities(characters: Element[]) {
  return characters.map((character) => Number((character as HTMLElement).style.opacity));
}

describe("GSAP summary reveal", () => {
  it("starts muted, reveals in reading order, and fully reverses", () => {
    const { split, animation } = reveal("A thoughtful experience.");
    animation.progress(0);
    expect(opacities(split.chars).every((opacity) => opacity === 0.2)).toBe(true);
    animation.progress(0.5);
    const middle = opacities(split.chars);
    expect(middle[0]).toBe(1);
    expect(middle.at(-1)).toBe(0.2);
    expect(middle.some((opacity) => opacity > 0.2 && opacity < 1)).toBe(true);
    expect(middle.every((opacity, index) => index === 0 || opacity <= middle[index - 1])).toBe(true);
    animation.progress(1);
    expect(opacities(split.chars).every((opacity) => opacity === 1)).toBe(true);
    animation.progress(0.5);
    expect(opacities(split.chars)).toEqual(middle);
    animation.progress(0);
    expect(opacities(split.chars).every((opacity) => opacity === 0.2)).toBe(true);
  });

  it("preserves graphemes and readable accessible text, then restores original markup", () => {
    const text = "Cafe\u0301 👩🏽‍💻 works.";
    const { element, split, animation } = reveal(text);
    expect(element.textContent).toBe(text);
    expect(element.getAttribute("aria-label")).toBe(text);
    expect(split.chars.map((character) => character.textContent)).toContain("e\u0301");
    expect(split.chars.map((character) => character.textContent)).toContain("👩🏽‍💻");
    animation.revert();
    split.revert();
    expect(element.innerHTML).toBe(text);
    expect(element.hasAttribute("aria-label")).toBe(false);
  });
});
