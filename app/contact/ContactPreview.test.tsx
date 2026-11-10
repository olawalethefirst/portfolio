import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContactPreview } from "./ContactPreview";

describe("Contact preview", () => {
  it("shows the built-in thank-you state and lets visitors start again", async () => {
    render(<ContactPreview />);
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
