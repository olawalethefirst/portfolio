# Markdown field and comment rendering

`src/components/markdown-field/MarkdownField.tsx` composes HeroUI field and toolbar
controls with the shared TextArea. Use it when Markdown authoring and preview are
needed; ordinary TextArea consumers remain plain text.

Pass controlled `value`/`onChange`, a visible `label`, validation props and
`maxLength`. `formats` selects bold, italic, link and quote controls; an empty
array keeps only Write/Preview. `editorHeightClassName` sets the fixed writing
and preview height (defaults to `h-28`). `textareaRef` exposes the textarea while
in Write mode; it is null in Preview. The enclosing outline owns focus and
validation styling; the embedded textarea has no separate outline.

Commands insert Markdown around the saved selection. They do not toggle existing
syntax. Empty selections get placeholders; link insertion selects the URL.
Formatting that exceeds maxLength leaves the source intact and announces why.
Formatting toolbar buttons are justified icon-only ghost exceptions under the
[field and button icon policy](field-and-button-icon-policy.md).

`CommentMarkdown` is shared by preview and comment display. It allows paragraphs,
line breaks, strong, emphasis, links and blockquotes. Raw HTML is skipped, images
are excluded, unsupported wrappers retain readable text, and react-markdown's
safe URL transformation remains enabled. No raw HTML plugins are used.
Recipient mentions remain separate plain-text metadata.

CommentForm owns draft and validation. Resetting its MarkdownField key after a
submission attempt returns the editor to Write, so required-field errors can be
focused even when the attempt originated in Preview. Successful submission clears
the source and retains the author name. Comments remain local to the page visit.
