import { fireEvent, render as baseRender, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiRequestError } from "@/src/api/client";
import { QueryProvider } from "@/src/api/QueryProvider";

const { post, list } = vi.hoisted(() => ({ post: vi.fn(), list: vi.fn() }));
vi.mock("@/src/cms/publication-comment-api", () => ({ publicationCommentApi: { post, list } }));

import { PublicationComments } from "./PublicationComments";

const render = (ui: ReactElement) => baseRender(<QueryProvider>{ui}</QueryProvider>);

type Thread = { id: string; name: string; date: string; text: string; replies: Thread[] };
const publicationId = "pub-1";

/** Stands in for the server: appends the posted comment and returns all threads. */
function fakeServer(start: Thread[]) {
  let current = start;
  post.mockImplementation(async (_id: string, input: { parentId: string | null; name: string; bodyMarkdown: string }) => {
    const entry = { id: crypto.randomUUID(), name: input.name, date: "2026-10-01T00:00:00.000Z", text: input.bodyMarkdown, replies: [] };
    current = input.parentId === null
      ? [...current, entry]
      : current.map((thread) => thread.id === input.parentId ? { ...thread, replies: [...thread.replies, entry] } : thread);
    return current;
  });
}

const threads = [{ id: "thread", name: "Ada", date: "2026-09-20", text: "A useful perspective.", replies: [
  { id: "child", name: "Sam", date: "2026-09-21", text: "Agreed." },
] }];

function fillForm(form: HTMLElement, text: string) {
  fireEvent.change(within(form).getByRole("textbox", { name: "Name" }), { target: { value: "Alex" } });
  fireEvent.change(within(form).getByRole("textbox", { name: /Comment|Reply/ }), { target: { value: text } });
}

beforeEach(() => {
  post.mockReset();
  list.mockReset();
  list.mockResolvedValue(threads);
  fakeServer(threads as Thread[]);
});

describe("PublicationComments", () => {
  it("posts locally, retaining the name and clearing the message", async () => {
    render(<PublicationComments publicationId={publicationId} initialThreads={threads} />);
    const form = screen.getByRole("form", { name: "New comment" });
    fillForm(form, "Thanks for sharing.");
    fireEvent.submit(form);
    expect(await screen.findByText("Thanks for sharing.")).toBeTruthy();
    expect((within(form).getByRole("textbox", { name: "Name" }) as HTMLInputElement).value).toBe("Alex");
    await waitFor(() => expect((within(form).getByRole("textbox", { name: "Comment" }) as HTMLTextAreaElement).value).toBe(""));
    expect(post).toHaveBeenCalledWith(publicationId, { parentId: null, name: "Alex", bodyMarkdown: "Thanks for sharing." });
  });

  it("keeps replies to children in the original thread and addresses the recipient", async () => {
    render(<PublicationComments publicationId={publicationId} initialThreads={threads} />);
    fireEvent.click(screen.getByRole("button", { name: "Reply to Sam" }));
    const form = screen.getByRole("form", { name: "Reply to Sam" });
    expect(document.activeElement).toBe(within(form).getByRole("textbox", { name: "Reply" }));
    fillForm(form, "That helped me too.");
    fireEvent.submit(form);
    await waitFor(() => expect(screen.queryByRole("form", { name: "Reply to Sam" })).toBeNull());
    expect(post).toHaveBeenCalledWith(publicationId, { parentId: "thread", name: "Alex", bodyMarkdown: "@Sam That helped me too." });
    const replies = screen.getByRole("list", { name: "Replies to Ada" });
    expect(within(replies).getByText("That helped me too.", { exact: false })).toBeTruthy();
    expect(within(replies).getAllByRole("listitem")).toHaveLength(2);
  });

  it("validates whitespace and restores focus when cancelling", async () => {
    render(<PublicationComments publicationId={publicationId} initialThreads={threads} />);
    const form = screen.getByRole("form", { name: "New comment" });
    fillForm(form, "   ");
    const textarea = within(form).getByRole("textbox", { name: "Comment" });
    fireEvent.submit(form);
    expect(screen.getByText("Enter a comment.")).toBeTruthy();
    expect(within(form).getByRole("textbox", { name: "Comment" })).toBe(textarea);
    const trigger = screen.getByRole("button", { name: "Reply to Ada" });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(document.activeElement).toBe(trigger);
  });

  it("opens only one reply form and posts a direct reply without a child mention", async () => {
    render(<PublicationComments publicationId={publicationId} initialThreads={threads} />);
    fireEvent.click(screen.getByRole("button", { name: "Reply to Sam" }));
    fireEvent.click(screen.getByRole("button", { name: "Reply to Ada" }));
    expect(screen.queryByRole("form", { name: "Reply to Sam" })).toBeNull();
    const form = screen.getByRole("form", { name: "Reply to Ada" });
    const existingReply = screen.getByRole("article", { name: "Comment by Sam" });
    expect(existingReply.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(screen.getByRole("list", { name: "Replies to Ada" })).getByRole("form", { name: "Reply to Ada" })).toBe(form);
    fillForm(form, "A direct response.");
    fireEvent.submit(form);
    await waitFor(() => expect(post).toHaveBeenCalledWith(publicationId, { parentId: "thread", name: "Alex", bodyMarkdown: "A direct response." }));
    const replies = await screen.findByRole("list", { name: "Replies to Ada" });
    expect(await within(replies).findByText("A direct response.")).toBeTruthy();
    expect(within(replies).getAllByRole("listitem")).toHaveLength(2);
  });

  it("posts the previewed Markdown and returns to an empty writing field", async () => {
    render(<PublicationComments publicationId={publicationId} initialThreads={threads} />);
    const form = screen.getByRole("form", { name: "New comment" });
    fillForm(form, "**A clear explanation.**");
    fireEvent.click(within(form).getByRole("button", { name: "Preview" }));
    expect(within(form).getByText("A clear explanation.").tagName).toBe("STRONG");
    fireEvent.click(within(form).getByRole("button", { name: "Post" }));
    const posted = await screen.findByRole("article", { name: "Comment by Alex" });
    expect(within(posted).getByText("A clear explanation.").tagName).toBe("STRONG");
    await waitFor(() => expect((within(form).getByRole("textbox", { name: "Comment" }) as HTMLTextAreaElement).value).toBe(""));
    expect(within(form).queryByRole("region", { name: "Comment preview" })).toBeNull();
  });

  it("returns from an empty preview to the invalid writing field", async () => {
    render(<PublicationComments publicationId={publicationId} initialThreads={threads} />);
    const form = screen.getByRole("form", { name: "New comment" });
    fillForm(form, "   ");
    fireEvent.click(within(form).getByRole("button", { name: "Preview" }));
    expect(within(form).getByText("Nothing to preview yet.")).toBeTruthy();
    fireEvent.submit(form);
    expect(within(form).getByText("Enter a comment.")).toBeTruthy();
    expect(document.activeElement).toBe(within(form).getByRole("textbox", { name: "Comment" }));
  });

  it("keeps the message and shows an alert when posting fails", async () => {
    post.mockRejectedValue(new ApiRequestError("network", null));
    render(<PublicationComments publicationId={publicationId} initialThreads={threads} />);
    const form = screen.getByRole("form", { name: "New comment" });
    fillForm(form, "Keep me.");
    fireEvent.submit(form);
    expect((await within(form).findByRole("alert")).textContent).toContain("Couldn’t reach the server.");
    expect((within(form).getByRole("textbox", { name: "Comment" }) as HTMLTextAreaElement).value).toBe("Keep me.");
  });

  it("maps server field issues onto the form fields", async () => {
    post.mockRejectedValue(new ApiRequestError("server", 422, {
      code: "VALIDATION_ERROR",
      message: "Check the highlighted fields.",
      issues: [{ pointer: "/name", message: "Use 80 characters or fewer." }],
    }));
    render(<PublicationComments publicationId={publicationId} initialThreads={threads} />);
    const form = screen.getByRole("form", { name: "New comment" });
    fillForm(form, "Hello");
    fireEvent.submit(form);
    expect(await within(form).findByText("Use 80 characters or fewer.")).toBeTruthy();
  });

  it("ignores a second submit while a post is pending", async () => {
    let resolve: (value: unknown) => void = () => {};
    post.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<PublicationComments publicationId={publicationId} initialThreads={threads} />);
    const form = screen.getByRole("form", { name: "New comment" });
    fillForm(form, "Once only.");
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post).toHaveBeenCalledTimes(1);
    resolve(threads);
    await waitFor(() => expect((within(form).getByRole("textbox", { name: "Comment" }) as HTMLTextAreaElement).value).toBe(""));
  });

  it("replaces the list with the server's refreshed threads", async () => {
    post.mockResolvedValue([...threads, { id: "other", name: "Lee", date: "2026-10-02T00:00:00.000Z", text: "Posted elsewhere.", replies: [] }]);
    render(<PublicationComments publicationId={publicationId} initialThreads={threads} />);
    const form = screen.getByRole("form", { name: "New comment" });
    fillForm(form, "Mine.");
    fireEvent.submit(form);
    expect(await screen.findByText("Posted elsewhere.")).toBeTruthy();
  });

  it("renders the server-rendered threads without an initial fetch", () => {
    render(<PublicationComments publicationId={publicationId} initialThreads={threads} />);
    expect(screen.getByText("A useful perspective.")).toBeTruthy();
    expect(list).not.toHaveBeenCalled();
  });
});
