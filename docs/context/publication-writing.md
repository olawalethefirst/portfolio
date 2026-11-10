# Publication article writing

Local publications use an Article card to open a dedicated Markdown workspace.
This replaces the inline article textarea in the publication form. External
publications retain their destination field and preserve any inactive article.

## Form and workspace

The Article card shows an empty state or a short plain-text excerpt, word count,
article dirty state and Write article/Edit article action. A required-body error
is associated with that action; publication validation can focus the action.

Opening the writer hides CMS navigation and metadata controls. A sticky header
uses the shared HeaderActionBar for its icon-only back action (accessible name:
Back to publication), Save draft action and read-only publication title. Back
navigation occupies its own row above the publication title and save action.
Write/Preview tabs and formatting tools follow the header. Write/Preview uses the secondary Tabs variant,
with each tab sharing half the writing container width. Formatting has a separate divider
limited to the centered writing column. Its controls wrap on narrow screens.
Headings use a regular-weight H trigger and an H1–H6 popover; bulleted and numbered lists
are separate inline Lucide List and ListOrdered buttons. Every formatting trigger
has a tooltip on hover and keyboard focus, without an extra focusable wrapper.

The source field starts directly beneath formatting. Top and side spacing belongs
to the textarea padding, not an outer margin or padding, so the area immediately
below the toolbar accepts clicks for typing. The caret is the editor focus cue;
no editor border, ring or outline is added. Formatting controls and tabs retain
keyboard focus indicators. Save status appears in the header and local-draft
feedback follows the editor, leaving no feedback block above the writing field.
The textarea grows with its content and stays mounted while switching views.

The writer shares the form's working draft and explicit save operation. It can
open before any publication record exists. Back retains current edits, restores
form scroll/focus, and makes no save request. Save draft saves the whole
publication and keeps the writer open; Publish stays on the publication form.
Pending saves retain the existing snapshot/duplicate-submit/error behavior.
Browser recovery uses the existing local-draft provider. Opening the writer
again after reload is explicit, through the Article card.

Write/Preview retains the same mounted textarea and restores its selection and
page position. Formatting and dialog insertion use the remembered selection.
Native insertion is attempted to preserve undo, with the existing computed-text
fallback when unavailable. Native undo behavior still requires browser review.
Escape returns to the form unless an insertion dialog is active; a dialog must
close before Escape can leave the writing workspace.

## Formatting

- H1–H6 are available in the heading popover.
- Bulleted and numbered lists apply to whole selected lines.
- Bold, italics and quote commands reuse the established Markdown operations.
- Links request link text and a complete HTTPS destination. Labels are escaped
  and destinations are enclosed in angle brackets to preserve parentheses.
- Inline code chooses delimiters that preserve selected backticks. Code blocks
  request code and an optional language, and choose a fence longer than any
  backtick run in the inserted content.
- Image insertion opens the native file picker directly, without a modal. It
  inserts Markdown at the saved selection and selects the description inside
  `![Image description](...)` for inline alt-text editing. Selected source text
  supplies the description when available. Cancel leaves source unchanged.
  Existing picker MIME/size/read-error and stale-result handling remains in
  force. If source changes during file reading/decoding, insert at the current
  caret using the latest source so newer edits are preserved.

The local image picker uses raster data URLs, not Supabase uploads. No media
asset, publication or database record is created by selecting an image. Durable
uploads and media-library selection remain server integration work. Large local
images may exceed browser draft storage; existing persistence feedback reports
that failure without discarding the working content.

## Preview rendering

`PublicationMarkdown` is shared by publication details and writing preview. It
supports article headings, lists, links, code, images, quotes and GFM tables.
Raw HTML is skipped. The default URL sanitizer remains active, with one narrow
exception: base64 PNG/JPEG/WebP image sources from the local picker. Data URLs
are not allowed in links or for SVG images. Comments continue using their own
restricted renderer and formatting toolbar.

## Icon decisions

| Control | Candidates | Decision |
|---|---|---|
| Write/Edit article | SquarePen, FileText | Leading SquarePen communicates editing |
| Save draft | Save, Check | Retain leading Save |
| Insert image | ImagePlus, Image | ImagePlus identifies insertion |
| Insert link / destination | Link, ExternalLink | Link identifies a text hyperlink |
| Insert code block | FileCode2, Code | FileCode2 distinguishes a block from inline Code |
| Link text / image description / language inputs | Type, TextCursorInput | Omit; visible labels convey meaning without repeated icons |
| Headings | H, Heading | Regular-weight H opens the labelled H1–H6 popover |
| Lists | List, ListOrdered | Separate inline icons for each list type |
| Write / Preview | Pencil, Eye | Text-labelled secondary tabs with selected state |

Back uses HeaderActionBar's tertiary ArrowLeft icon button consistently with
nested CMS editors and preview screens. Its back-button ref preserves entry focus
and return restoration. Cancel remains a text-only ghost action. Formatting controls use named,
icon-only ghost buttons as a compact-toolbar exception, consistent with the
shared Markdown field. Textareas are icon-free.

## Verification boundaries

Behavioral tests cover formatting ranges and escaping, opening before save,
Back restoration, explicit saving, Write/Preview selection, link validation,
image insertion and unsafe Markdown destinations. Browser/build checks remain
controller-owned under CONSTRAINTS.md. Performance is classified `possible`:
verify typing and caret continuity on a long article, no horizontal overflow at
320 CSS pixels, and no remount of the source field on Write/Preview. Word-count
parsing is deferred; article rendering runs only in Preview.
