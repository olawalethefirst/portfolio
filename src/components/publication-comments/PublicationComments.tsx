"use client";

import { useRef, useState } from "react";

import { CommentForm } from "./CommentForm";
import { CommentThread, type CommentEntry, type CommentThreadData } from "./CommentThread";

interface ReplyTarget {
  threadId: string;
  comment: CommentEntry;
}

export function PublicationComments({ initialThreads = [] }: { initialThreads?: CommentThreadData[] }) {
  const [threads, setThreads] = useState(initialThreads);
  const [name, setName] = useState("");
  const [target, setTarget] = useState<ReplyTarget | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  function closeReply() {
    setTarget(null);
    trigger.current?.focus();
  }

  function createComment(text: string): CommentEntry {
    return { id: crypto.randomUUID(), name: name.trim(), date: new Date().toISOString(), text };
  }

  return (
    <section aria-labelledby="comments-heading" className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8 lg:px-16">
      <div className="pt-12">
        <div className="mb-7 flex items-baseline gap-3">
          <h2 id="comments-heading" className="text-2xl font-semibold tracking-tight">Comments</h2>
        </div>
          <CommentForm name={name} onNameChange={setName} onSubmit={(text) => setThreads((current) => [...current, { ...createComment(text), replies: [] }])} />

        {threads.length ? (
          <ol aria-label="Comment threads" className="mt-10 divide-y divide-border border-y border-border">
            {threads.map((thread) => (
              <li key={thread.id} className="py-8">
                <CommentThread
                  thread={thread}
                  activeReplyId={target?.threadId === thread.id ? target.comment.id : undefined}
                  onReply={(comment, button) => {
                    trigger.current = button;
                    setTarget({ threadId: thread.id, comment });
                  }}
                  replyForm={target?.threadId === thread.id ? (
                    <CommentForm
                      key={target.comment.id}
                      name={name}
                      onNameChange={setName}
                      recipient={target.comment.name}
                      onCancel={closeReply}
                      onSubmit={(text) => {
                        const reply = { ...createComment(text), recipient: target.comment.id === thread.id ? undefined : target.comment.name };
                        setThreads((current) => current.map((item) => item.id === thread.id ? { ...item, replies: [...item.replies, reply] } : item));
                        closeReply();
                      }}
                    />
                  ) : null}
                />
              </li>
            ))}
          </ol>
        ) : <p className="mt-10 text-muted">Start the conversation with your perspective.</p>}
      </div>
    </section>
  );
}
