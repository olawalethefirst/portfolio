import type { ReactNode } from "react";

import { CommentMarkdown } from "@/src/components/markdown-field/CommentMarkdown";

import { Button } from "@/src/components/ui/Button";

export interface CommentEntry {
  id: string;
  name: string;
  date: string;
  text: string;
  recipient?: string;
}

export interface CommentThreadData extends CommentEntry {
  replies: CommentEntry[];
}

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});

function CommentItem({ comment, onReply }: {
  comment: CommentEntry;
  onReply: (comment: CommentEntry, trigger: HTMLButtonElement) => void;
}) {
  return (
    <article aria-label={`Comment by ${comment.name}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-semibold">{comment.name}</span>
        <time className="text-xs text-muted" dateTime={comment.date}>{dateFormatter.format(new Date(comment.date))}</time>
      </div>
      <div className="mt-3">
        {comment.recipient ? <p className="mb-1 font-medium text-accent">@{comment.recipient}</p> : null}
        <CommentMarkdown>{comment.text}</CommentMarkdown>
      </div>
      <Button aria-label={`Reply to ${comment.name}`} className="mt-2" variant="ghost" size="sm" onPress={(event) => {
        if (event.target instanceof HTMLButtonElement) onReply(comment, event.target);
      }}>Reply</Button>
    </article>
  );
}

export function CommentThread({ thread, onReply, activeReplyId, replyForm }: {
  thread: CommentThreadData;
  onReply: (comment: CommentEntry, trigger: HTMLButtonElement) => void;
  activeReplyId?: string;
  replyForm?: ReactNode;
}) {
  return (
    <>
      <CommentItem comment={thread} onReply={onReply} />
      {thread.replies.length || activeReplyId ? (
        <ol aria-label={`Replies to ${thread.name}`} className="mt-6 ml-3 space-y-7 border-l border-border pl-5 sm:ml-5 sm:pl-7">
          {thread.replies.map((reply) => (
            <li key={reply.id}>
              <CommentItem comment={reply} onReply={onReply} />
            </li>
          ))}
          {activeReplyId ? <li>{replyForm}</li> : null}
        </ol>
      ) : null}
    </>
  );
}
