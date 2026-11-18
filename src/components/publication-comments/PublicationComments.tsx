"use client";

import { useRef, useState } from "react";

import { ApiRequestError } from "@/src/api/client";
import {
  usePostPublicationComment,
  usePublicationCommentsQuery,
} from "@/src/cms/publication-comment-queries";

import { CommentForm, type CommentSubmitResult } from "./CommentForm";
import {
  CommentThread,
  type CommentEntry,
  type CommentThreadData,
} from "./CommentThread";

interface ReplyTarget {
  threadId: string;
  comment: CommentEntry;
}

const fieldPointers = { "/name": "name", "/bodyMarkdown": "text" } as const;

export function PublicationComments({
  publicationId,
  initialThreads = [],
}: {
  publicationId: string;
  initialThreads?: CommentThreadData[];
}) {
  const { data: threads } = usePublicationCommentsQuery(
    publicationId,
    initialThreads,
  );
  const { post: postComment } = usePostPublicationComment(publicationId);
  const [name, setName] = useState("");
  const [target, setTarget] = useState<ReplyTarget | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  function closeReply() {
    setTarget(null);
    trigger.current?.focus();
  }

  /** A reply to a reply is addressed in the stored text; no recipient is persisted. */
  async function post(
    text: string,
    parentId: string | null,
    recipient?: string,
  ): Promise<CommentSubmitResult> {
    try {
      await postComment({
        parentId,
        name: name.trim(),
        bodyMarkdown: recipient ? `@${recipient} ${text}` : text,
      });
      return { ok: true };
    } catch (error) {
      const issues =
        error instanceof ApiRequestError ? error.error?.issues : undefined;
      const fieldErrors: { name?: string; text?: string } = {};
      for (const issue of issues ?? []) {
        const field =
          fieldPointers[issue.pointer as keyof typeof fieldPointers];
        if (field) fieldErrors[field] ??= issue.message;
      }
      if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
      return {
        ok: false,
        message:
          error instanceof ApiRequestError
            ? error.message
            : "Unable to post your comment. Try again.",
      };
    }
  }

  return (
    <section
      aria-labelledby="comments-heading"
      className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8 lg:px-16"
    >
      <div className="pt-12">
        <div className="mb-7 flex items-baseline gap-3">
          <h2
            id="comments-heading"
            className="text-2xl font-semibold tracking-tight"
          >
            Comments
          </h2>
        </div>
        <CommentForm
          name={name}
          onNameChange={setName}
          onSubmit={(text) => post(text, null)}
        />

        {threads.length ? (
          <ol
            aria-label="Comment threads"
            className="mt-10 divide-y divide-border border-y border-border"
          >
            {threads.map((thread) => (
              <li key={thread.id} className="py-8">
                <CommentThread
                  thread={thread}
                  activeReplyId={
                    target?.threadId === thread.id
                      ? target.comment.id
                      : undefined
                  }
                  onReply={(comment, button) => {
                    trigger.current = button;
                    setTarget({ threadId: thread.id, comment });
                  }}
                  replyForm={
                    target?.threadId === thread.id ? (
                      <CommentForm
                        key={target.comment.id}
                        name={name}
                        onNameChange={setName}
                        recipient={target.comment.name}
                        onCancel={closeReply}
                        onSubmit={async (text) => {
                          const result = await post(
                            text,
                            thread.id,
                            target.comment.id === thread.id
                              ? undefined
                              : target.comment.name,
                          );
                          if (result.ok) closeReply();
                          return result;
                        }}
                      />
                    ) : null
                  }
                />
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-10 text-muted">
            Start the conversation with your perspective.
          </p>
        )}
      </div>
    </section>
  );
}
