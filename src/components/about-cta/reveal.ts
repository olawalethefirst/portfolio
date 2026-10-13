import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

export function createSummaryReveal(element: HTMLElement) {
  const split = SplitText.create(element, {
    type: "chars",
    tag: "span",
    aria: "auto",
  });
  gsap.set(split.chars, { opacity: 0.2 });
  const animation = gsap.timeline().to(split.chars, {
    opacity: 1,
    stagger: 0.1,
  });
  return { split, animation };
}
