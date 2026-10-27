import { fireEvent, render, screen, within } from "@testing-library/react";
import { Form } from "@heroui/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { MarkdownField } from "./MarkdownField";
import { CommentMarkdown } from "./CommentMarkdown";

function Editor({ onSubmit = () => {}, maxLength }: { onSubmit?: () => void; maxLength?: number }) {
  const [value, setValue] = useState("hello world");
  return <Form onSubmit={onSubmit}><MarkdownField label="Comment" value={value} onChange={setValue} maxLength={maxLength} /></Form>;
}

describe("MarkdownField", () => {
  it("formats the saved selection, restores focus and never submits", () => {
    const submit = vi.fn();
    render(<Editor onSubmit={submit} />);
    const textarea = screen.getByRole("textbox", { name: "Comment" }) as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(6, 11);
    fireEvent.select(textarea);
    fireEvent.click(screen.getByRole("button", { name: "Bold" }));
    expect(textarea.value).toBe("hello **world**");
    expect(document.activeElement).toBe(textarea);
    expect(textarea.selectionStart).toBe(8);
    expect(textarea.selectionEnd).toBe(13);
    expect(submit).not.toHaveBeenCalled();
  });

  it("previews formatting and preserves draft and caret when returning to Write", () => {
    render(<Editor />);
    let textarea = screen.getByRole("textbox", { name: "Comment" }) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "**A point**" } });
    textarea.setSelectionRange(2, 9);
    fireEvent.select(textarea);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    const preview = screen.getByRole("region", { name: "Comment preview" });
    expect(within(preview).getByText("A point").tagName).toBe("STRONG");
    expect((screen.getByRole("button", { name: "Bold" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Write" }));
    textarea = screen.getByRole("textbox", { name: "Comment" }) as HTMLTextAreaElement;
    expect(textarea.value).toBe("**A point**");
    expect(textarea.selectionStart).toBe(2);
    expect(document.activeElement).toBe(textarea);
  });

  it("announces rejected formatting without changing source", () => {
    render(<Editor maxLength={12} />);
    fireEvent.click(screen.getByRole("button", { name: "Bold" }));
    expect(screen.getByRole("status").textContent).toContain("12 character limit");
    expect((screen.getByRole("textbox", { name: "Comment" }) as HTMLTextAreaElement).value).toBe("hello world");
  });

  it("respects format configuration, disabled state and field errors", () => {
    render(<MarkdownField label="Reply" value="" onChange={() => {}} formats={["italic"]} isDisabled isInvalid errorMessage="Enter a reply." />);
    expect(screen.queryByRole("button", { name: "Bold" })).toBeNull();
    expect((screen.getByRole("button", { name: "Italic" }) as HTMLButtonElement).disabled).toBe(true);
    const field = screen.getByRole("textbox", { name: "Reply" });
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(field.getAttribute("aria-describedby")!)?.textContent).toContain("Enter a reply.");
  });
});

it("renders restricted comment Markdown without executable HTML, unsafe links or media", () => {
  const { container } = render(<CommentMarkdown>{'**bold** and *italic*\n\n> quote\n\n[good](https://example.com) [bad](javascript:alert%281%29)\n\n![image](https://example.com/image.jpg)\n\n<script>alert(1)</script>\n\n# Heading'}</CommentMarkdown>);
  expect(screen.getByText("bold").tagName).toBe("STRONG");
  expect(screen.getByText("italic").tagName).toBe("EM");
  expect(screen.getByText("quote").closest("blockquote")).toBeTruthy();
  expect(screen.getByRole("link", { name: "good" }).getAttribute("href")).toBe("https://example.com");
  expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
  expect(container.querySelector("img, script, h1")).toBeNull();
});
