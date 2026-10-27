import Markdown from "react-markdown";

export function CommentMarkdown({ children }: { children: string }) {
  return (
    <div className="space-y-3 text-base leading-7 wrap-anywhere [&_p]:whitespace-pre-wrap [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted">
      <Markdown allowedElements={["p", "br", "strong", "em", "a", "blockquote"]} skipHtml unwrapDisallowed>
        {children}
      </Markdown>
    </div>
  );
}
