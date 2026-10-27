import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicationComments } from "./PublicationComments";

const threads = [{ id: "thread", name: "Ada", date: "2026-09-20", text: "A useful perspective.", replies: [
  { id: "child", name: "Sam", date: "2026-09-21", text: "Agreed." },
] }];

function fillForm(form: HTMLElement, text: string) {
  fireEvent.change(within(form).getByRole("textbox", { name: "Name" }), { target: { value: "Alex" } });
  fireEvent.change(within(form).getByRole("textbox", { name: /Comment|Reply/ }), { target: { value: text } });
}

describe("PublicationComments", () => {
  it("posts locally, retaining the name and clearing the message", () => {
    render(<PublicationComments initialThreads={threads} />);
    const form = screen.getByRole("form", { name: "New comment" });
    fillForm(form, "Thanks for sharing.");
    fireEvent.submit(form);
    expect(screen.getByText("Thanks for sharing.")).toBeTruthy();
    expect((within(form).getByRole("textbox", { name: "Name" }) as HTMLInputElement).value).toBe("Alex");
    expect((within(form).getByRole("textbox", { name: "Comment" }) as HTMLTextAreaElement).value).toBe("");
  });

  it("keeps replies to children in the original thread and addresses the recipient", () => {
    render(<PublicationComments initialThreads={threads} />);
    fireEvent.click(screen.getByRole("button", { name: "Reply to Sam" }));
    const form = screen.getByRole("form", { name: "Reply to Sam" });
    expect(document.activeElement).toBe(within(form).getByRole("textbox", { name: "Reply" }));
    fillForm(form, "That helped me too.");
    fireEvent.submit(form);
    const replies = screen.getByRole("list", { name: "Replies to Ada" });
    expect(within(replies).getByText("@Sam")).toBeTruthy();
    expect(within(replies).getByText("That helped me too.", { exact: false })).toBeTruthy();
    expect(within(replies).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByRole("form", { name: "Reply to Sam" })).toBeNull();
  });

  it("validates whitespace and restores focus when cancelling", () => {
    render(<PublicationComments initialThreads={threads} />);
    const form = screen.getByRole("form", { name: "New comment" });
    fillForm(form, "   ");
    fireEvent.submit(form);
    expect(screen.getByText("Enter a comment.")).toBeTruthy();
    const trigger = screen.getByRole("button", { name: "Reply to Ada" });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(document.activeElement).toBe(trigger);
  });

  it("opens only one reply form and posts a direct reply without a child mention", () => {
    render(<PublicationComments initialThreads={threads} />);
    fireEvent.click(screen.getByRole("button", { name: "Reply to Sam" }));
    fireEvent.click(screen.getByRole("button", { name: "Reply to Ada" }));
    expect(screen.queryByRole("form", { name: "Reply to Sam" })).toBeNull();
    const form = screen.getByRole("form", { name: "Reply to Ada" });
    const existingReply = screen.getByRole("article", { name: "Comment by Sam" });
    expect(existingReply.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(screen.getByRole("list", { name: "Replies to Ada" })).getByRole("form", { name: "Reply to Ada" })).toBe(form);
    fillForm(form, "A direct response.");
    fireEvent.submit(form);
    const replies = screen.getByRole("list", { name: "Replies to Ada" });
    expect(within(replies).getByText("A direct response.").textContent).toBe("A direct response.");
    expect(within(replies).getAllByRole("listitem")).toHaveLength(2);
  });

  it("posts the previewed Markdown and returns to an empty writing field", () => {
    render(<PublicationComments initialThreads={threads} />);
    const form = screen.getByRole("form", { name: "New comment" });
    fillForm(form, "**A clear explanation.**");
    fireEvent.click(within(form).getByRole("button", { name: "Preview" }));
    expect(within(form).getByText("A clear explanation.").tagName).toBe("STRONG");
    fireEvent.click(within(form).getByRole("button", { name: "Post" }));
    const posted = screen.getByRole("article", { name: "Comment by Alex" });
    expect(within(posted).getByText("A clear explanation.").tagName).toBe("STRONG");
    expect((within(form).getByRole("textbox", { name: "Comment" }) as HTMLTextAreaElement).value).toBe("");
    expect(within(form).queryByRole("region", { name: "Comment preview" })).toBeNull();
  });

  it("returns from an empty preview to the invalid writing field", () => {
    render(<PublicationComments initialThreads={threads} />);
    const form = screen.getByRole("form", { name: "New comment" });
    fillForm(form, "   ");
    fireEvent.click(within(form).getByRole("button", { name: "Preview" }));
    expect(within(form).getByText("Nothing to preview yet.")).toBeTruthy();
    fireEvent.submit(form);
    expect(within(form).getByText("Enter a comment.")).toBeTruthy();
    expect(document.activeElement).toBe(within(form).getByRole("textbox", { name: "Comment" }));
  });
});
