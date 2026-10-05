import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ContactConversationSection } from "./ContactConversationSection";

function advanceToContactDetails() {
  fireEvent.click(screen.getByRole("radio", { name: /^Hire/ }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Your goal" }), {
    target: { value: "  Build a thoughtful portfolio experience.  " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
}

describe("ContactConversationSection", () => {
  it("links to the configured social profiles from the heading cluster", () => {
    render(<ContactConversationSection onSubmit={vi.fn()} />);

    const socialLinks = screen.getByRole("navigation", { name: "Social links" });
    const profiles = [
      ["GitHub", "https://github.com/olawalethefirst"],
      ["LinkedIn", "https://www.linkedin.com/in/olawalethefirst"],
      ["X", "https://x.com/olawalethefirst"],
    ] as const;

    for (const [name, href] of profiles) {
      const link = screen.getByRole("link", {
        name: `Visit ${name} profile (opens in a new tab)`,
      });
      expect(socialLinks.contains(link)).toBe(true);
      expect(link.getAttribute("href")).toBe(href);
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  it("moves through the conversation and preserves earlier answers", () => {
    render(<ContactConversationSection onSubmit={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "How would you like to connect?" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("progressbar", { name: "Contact progress" })
        .getAttribute("aria-valuetext"),
    ).toBe("Step 1 of 3");

    const hire = screen.getByRole("radio", { name: /^Hire/ });
    expect(
      screen.getByText("Discuss a project or long-term opportunity."),
    ).toBeTruthy();
    expect(
      screen.getByText("Create or explore something together."),
    ).toBeTruthy();
    expect(
      screen.getByText("Ask a question or start a conversation."),
    ).toBeTruthy();
    fireEvent.click(hire);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    const goalHeading = screen.getByRole("heading", {
        name: "What would you like to make happen?",
      });
    expect(goalHeading).toBeTruthy();
    expect(document.activeElement).toBe(goalHeading);
    expect(
      screen.getByText("Tell me about the project, role, or outcome."),
    ).toBeTruthy();

    const goal = screen.getByRole("textbox", { name: "Your goal" });
    fireEvent.change(goal, {
      target: { value: "Build a thoughtful portfolio experience." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect((hire as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      (screen.getByRole("textbox", { name: "Your goal" }) as HTMLTextAreaElement)
        .value,
    ).toBe("Build a thoughtful portfolio experience.");
  });

  it("selects the Contact path and advances with its relevant prompt", () => {
    render(<ContactConversationSection onSubmit={vi.fn()} />);

    const contact = screen.getByRole("radio", { name: /^Contact/ });
    fireEvent.click(contact);

    expect((contact as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      screen.getByRole("heading", {
        name: "What would you like to make happen?",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Tell me what you’d like help with.")).toBeTruthy();
  });

  it("keeps visitors on the active step until its answer is valid", () => {
    render(<ContactConversationSection onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Choose how you’d like to connect.")).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: /^Hire/ }),
    );

    fireEvent.click(screen.getByRole("radio", { name: /^Hire/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Your goal" }), {
      target: { value: "Too short" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      screen.getByText("Share at least 10 characters so I have some context."),
    ).toBeTruthy();

    fireEvent.change(screen.getByRole("textbox", { name: "Your goal" }), {
      target: { value: "Build a thoughtful portfolio experience." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Send inquiry" }));

    expect(screen.getByText("Enter your name.")).toBeTruthy();
    expect(screen.getByText("Enter your email address.")).toBeTruthy();

    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "Ada Lovelace" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send inquiry" }));
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      (screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement).value,
    ).toBe("Ada Lovelace");
    expect(
      (screen.getByRole("textbox", { name: "Email" }) as HTMLInputElement).value,
    ).toBe("not-an-email");
  });

  it("submits one normalized inquiry, confirms it, and resets the flow", async () => {
    let resolveSubmission: (() => void) | undefined;
    const pendingSubmission = new Promise<void>((resolve) => {
      resolveSubmission = resolve;
    });
    const onSubmit = vi.fn(() => pendingSubmission);

    render(<ContactConversationSection onSubmit={onSubmit} />);
    advanceToContactDetails();
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "  Ada Lovelace  " },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), {
      target: { value: "  ada@example.com  " },
    });

    const sendButton = screen.getByRole("button", { name: "Send inquiry" });
    fireEvent.click(sendButton);
    fireEvent.click(sendButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      email: "ada@example.com",
      goal: "Build a thoughtful portfolio experience.",
      intent: "hire",
      name: "Ada Lovelace",
    });
    expect(sendButton.hasAttribute("disabled")).toBe(true);

    resolveSubmission?.();

    expect(await screen.findByRole("status")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Thanks, Ada Lovelace." }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Submit another" }));

    expect(
      screen
        .getByRole("progressbar", { name: "Contact progress" })
        .getAttribute("aria-valuetext"),
    ).toBe("Step 1 of 3");
    expect(
      (screen.getByRole("radio", { name: /^Hire/ }) as HTMLInputElement).checked,
    ).toBe(false);
  });

  it("retains answers and reports a recoverable submission failure", async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new Error("Private provider failure details"));

    render(<ContactConversationSection onSubmit={onSubmit} />);
    advanceToContactDetails();
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "Ada Lovelace" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), {
      target: { value: "ada@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send inquiry" }));

    expect(
      await screen.findByText(
        "I couldn’t send your inquiry. Please try again.",
      ),
    ).toBeTruthy();
    expect(
      (screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement).value,
    ).toBe("Ada Lovelace");
    expect(screen.queryByText("Private provider failure details")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Send inquiry" }).hasAttribute("disabled"),
    ).toBe(false);
  });
});
