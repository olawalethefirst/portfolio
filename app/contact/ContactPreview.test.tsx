import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { back, push } = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back, push }) }));

import { SOCIAL_DEFAULT_DESTINATIONS } from "@/src/components/contact-conversation/social-profiles";
import { ContactPreview } from "./ContactPreview";

describe("Contact preview", () => {
  it("normalizes saved HTTPS links and keeps invalid destinations unavailable", () => {
    render(<ContactPreview destinations={{ github: "  https://example.com/maker  ", linkedin: "javascript:alert(1)", x: "" }} />);
    expect(screen.getByRole("link", { name: /Visit GitHub/ }).getAttribute("href")).toBe("https://example.com/maker");
    for (const label of ["LinkedIn", "X"]) {
      const link = screen.getByRole("link", { name: `Visit ${label} profile (opens in a new tab)` });
      expect(link.getAttribute("href")).toBeNull();
      expect(link.getAttribute("aria-disabled")).toBe("true");
    }
  });
  it("shows the built-in thank-you state and lets visitors start again", async () => {
    render(<ContactPreview destinations={SOCIAL_DEFAULT_DESTINATIONS} />);
    fireEvent.click(screen.getByRole("radio", { name: /^Hire/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Your goal" }), {
      target: { value: "Build a thoughtful portfolio experience." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "Ada Lovelace" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), {
      target: { value: "ada@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByRole("heading", { name: "Thanks, Ada Lovelace." })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Submit another" }));
    expect(screen.getByRole("radio", { name: /^Hire/ })).toBeTruthy();
  });
});
