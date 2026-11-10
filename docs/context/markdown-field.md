# Markdown field and comment rendering

Publication authoring uses the separate
[article workspace](publication-writing.md) and full article renderer. The
shared MarkdownField described here retains its restricted comment behavior.

`src/components/markdown-field/MarkdownField.tsx` composes HeroUI field and toolbar
controls with the shared TextArea. Use it when Markdown authoring and preview are
needed; ordinary TextArea consumers remain plain text.

Pass controlled `value`/`onChange`, a visible `label`, validation props and
`maxLength`. `formats` selects bold, italic, link and quote controls; an empty
array keeps only Write/Preview. `editorHeightClassName` sets the fixed writing
and preview height (defaults to `h-28`). `textareaRef` exposes the same mounted textarea
in both modes; it is hidden in Preview. The enclosing outline owns focus and
validation styling; the embedded textarea has no separate outline.

Commands insert Markdown around the saved selection. They do not toggle existing
syntax. Empty selections get placeholders; link insertion selects the URL.
Formatting that exceeds maxLength leaves the source intact and announces why.
Formatting applies the returned replacement range through
`document.execCommand("insertText")`, then synchronizes React with the resulting
DOM value. This deprecated API is used specifically to retain the browser's
editing history. If native insertion is unavailable, throws, or produces unexpected
text, apply the precomputed formatted value through React state and restore its
selection. This fallback keeps formatting available but may disrupt native undo
history. Reuse the computed result rather than formatting partially inserted text
again. Explicit toolbar formatting is not blocked by a composition flag. Native undo/redo and React event integration
require browser verification in Chrome, Firefox and Safari; jsdom tests simulate
insertion, not native edit history. Write/Preview hides rather than unmounts the
textarea to retain that history.
Formatting toolbar buttons are justified icon-only ghost exceptions under the
[field and button icon policy](field-and-button-icon-policy.md).

`CommentMarkdown` is shared by preview and comment display. It allows paragraphs,
line breaks, strong, emphasis, links and blockquotes. Raw HTML is skipped, images
are excluded, unsupported wrappers retain readable text, and react-markdown's
safe URL transformation remains enabled. No raw HTML plugins are used.
Recipient mentions remain separate plain-text metadata.

CommentForm owns draft and validation. Failed validation uses
`editorRef.showWrite()` to return to Write without remounting or replacing the
draft; the first invalid field receives focus. Successful submission resets the
MarkdownField key, intentionally starting a fresh edit history, clears the source,
and retains the author name. Comments remain local to the page visit.
