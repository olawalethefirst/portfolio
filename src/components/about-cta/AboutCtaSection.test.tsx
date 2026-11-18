import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

import { AboutCtaSection } from "./AboutCtaSection";

afterEach(() => vi.unstubAllGlobals());

const reduced = vi.hoisted(() => ({ value: false as boolean | null }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => reduced.value,
}));

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
  reduced.value = true;
});

describe("About CTA", () => {
  it("renders fully readable text on the server", () => {
    const markup = renderToString(<AboutCtaSection summary="An intact summary." />);
    expect(markup).toContain("An intact summary.");
    expect(markup).not.toContain("opacity:");
  });

  it.each([
    ["reveals the summary when reduced motion is off", false, true],
    ["keeps the summary fully visible when reduced motion is on", true, false],
    ["keeps the summary fully visible when the preference is unknown", null, false],
  ])("%s", (_name, preference, revealed) => {
    reduced.value = preference;
    const { container } = render(<AboutCtaSection summary="Hello." />);
    // The reveal splits the text into spans, so find the paragraph structurally.
    const paragraph = container.querySelector("p") as HTMLElement;
    expect(paragraph.textContent).toBe("Hello.");
    expect(Boolean(paragraph.querySelector("[style*='opacity']"))).toBe(revealed);
  });

  it("accepts editable heading and biography without changing its contact CTA", () => {
    render(<AboutCtaSection heading="Meet the maker" summary="A custom biography." />);
    expect(screen.getByRole("region", { name: "Meet the maker" })).toBeTruthy();
    expect(screen.getByText("A custom biography.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Start a conversation" }).getAttribute("href")).toBe("/contact");
  });

  it("links the conversation CTA to the contact form", () => {
    render(<AboutCtaSection />);
    const link = screen.getByRole("link", { name: "Start a conversation" });
    link.focus();
    expect(document.activeElement).toBe(link);
    expect(link.getAttribute("href")).toBe("/contact");
  });
});
