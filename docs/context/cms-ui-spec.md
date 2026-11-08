# CMS UI technical specification

Scope: CMS UI with mock interactions. Review each iteration before extending
to other content areas; task status belongs in the local CMS UI tracker.

## Objective and scope

Provide the portfolio owner with a content editing UI and trustworthy previews
using the existing public components. First milestone: publication list, editor,
card preview, and full-screen article preview working together with sample data.
Later milestones extend the same patterns to projects and singleton content.

This phase implements UI behavior with local mock data and interactions.
Keep state only where needed to demonstrate the UI. Backend contracts, API clients
and persistence architecture are deferred; future integration uses a dedicated
backend between the frontend and Supabase.
No Supabase calls, database migrations, authentication, health checks, CI changes,
real publishing, or changes to public content delivery are included. The CMS is
not secure merely because its URL is obscure. Keep the prototype disabled in
production by default behind a server-only opt-in; never add credentials or real
private data. Real access control is a prerequisite for production CMS release.

Assumptions for review: one editor, existing visual tokens and component library,
manual Save, no scheduling, no collaborator workflow, no standalone media library.
The first prototype uses in-memory editing state; reload resets it to fixtures.
Durable or session persistence is deferred. User-facing copy uses neutral action
feedback without mock/demo badges, reset notices or simulated-functionality
notices. Testing controls and failure toggles are absent from every CMS tab;
automated tests inject request failures through provider dependencies. Previews remain available; this copy policy does not change persistence
or submission behavior.

## Screen and content inventory

| Area | Screen content | Preview |
| --- | --- | --- |
| Publications | Search, status filter, dated list, create/edit; title, summary, local Markdown or external URL, cover, alt text, tags, publication date | PublicationCard; PublicationDetails for local articles |
| Projects | Ordered list; name, summary, What, How, mobile/web platform, screenshot, live URL | ProjectItem including What/How popovers |
| Homepage | Eyebrow, headline; tagline and description for idea, iterate, solution | PrismHeroLayout |
| About | Heading and biography | AboutCtaSection |
| Contact | GitHub, LinkedIn and X HTTPS URLs; fixed labels and accent-colored icons | Full contact section with social links and simulated contact form |
| SEO | Default title/description; exact site-path override list and editors, including local articles | Plain metadata summary, explicitly not a search-engine rendering guarantee |

Tags are managed in the publication editor through selection and creation of
nonblank, case-insensitively unique labels. No separate tags page is required.
Contact intents, navigation, section headings, CTA labels/destinations, settings
copy, form copy, and technical media properties remain in code. Do not add
comments, inquiry inboxes, or moderation screens in this phase.

Projects use the current What/How fields, not the removed solutions list. Hero
taglines include “Ship with confidence.” and must be editable. The earlier
`docs/contracts/cms-content-schema.md` is superseded for UI scope and explicitly
marked as such; it is not the implementation authority for this UI.

## Navigation and layout

Proposed routes: `/admin` redirects to `/admin/publications`; list/editor routes
under `/admin/publications` and `/admin/projects`; singleton routes
`/admin/homepage`, `/admin/about`, `/admin/contact`, `/admin/seo`. Contact uses list/new/ID editor routes; `/admin/social` redirects to Contact.
Use `/new` for creation and stable record IDs for editing. Separate preview routes are deferred. Route names are implementation proposals.

CMS Content navigation follows the homepage section order: Hero →
Projects → Publications → About → Contact → SEO, in both the desktop
sidebar and mobile drawer.
The Hero navigation item and editor use the short label “Hero”. Its leading
PanelTop icon was chosen over Sparkles to identify the top page section rather
than an effect. It uses the shared navigation icon sizing and decorative treatment,
including the existing navigation exception for ghost buttons.

Desktop uses a persistent sidebar, content header, and restrained form width.
Mobile uses a labelled navigation drawer with library-owned focus containment
and Escape dismissal. Publication editors expose separate fullscreen card and
article/destination preview actions alongside the editing fields, without an
inline preview tab. Keep save/status controls reachable without obscuring content.
Do not reproduce the public site's animated navigation inside the CMS shell.
Use the existing UI wrappers, semantic design tokens, light/dark modes, visible
labels, inline errors and status announcements. At 320 CSS px and 200% zoom,
all controls remain reachable without page-wide horizontal scrolling.

## Shared page layout contract

All CMS content areas use the same shell, typography, gutters, section spacing
and control sizing. Two layouts cover collection lists and editors. Optional
content occupies established areas; do not add empty panels or filler controls.

| Area, in page order | Editor | Collection list |
| --- | --- | --- |
| Header | Title and short description; back navigation above for individual records | Title and short description; Preview and New actions on the right |
| Toolbar | Preview actions on the left; Save/Publish actions on the right | Search on the left; applicable filters on the right |
| Feedback | Reserved save-status row, then request errors when present | Result count and operation feedback |
| Content | Main editing column and optional supporting column | Record rows or an empty/no-results state |
| Footer | Discard changes on the left; entity lifecycle actions on the right | Optional supporting actions |

Use the current shell's max-w-6xl container, shared responsive gutters, and a
consistent title hierarchy. Editors with supporting content use the existing
main-column/18rem-supporting-column grid and gap-10 spacing. Supporting content
includes images and publishing settings. Editors without supporting content fill
the shared page container without an additional field-width cap. Sections share visible headings
and field spacing; field labels, hints and errors use the shared field treatment.

Every editor offers an icon-free ghost **Discard changes** action in the footer's
left group. It restores the last demo-saved values (an empty draft for a new,
never-saved item), clears stale validation and request feedback, and leaves saved
and published snapshots unchanged. Disable discard when unchanged or saving.
The right group holds applicable entity lifecycle actions: Unpublish for published
items and Delete for saved Publications and Projects, including draft-only
records. Never-saved new items have no Delete action. Both editors use the same
right-hand footer placement and shared dialog presentation. Hero has no Reset to defaults action. Collapsed Demo
controls follow the footer.

Lifecycle button variants are owned by `CmsLifecycleButton`, composed with the
existing HeroUI-backed Button wrapper. Delete entry points in editor footers use
`danger-soft`; their final confirmations use `danger`.
Unpublish uses `outline` in both footer and confirmation because it withdraws
visibility while retaining the draft. Discard and Cancel remain `ghost`. Callers
supply the action, confirmation stage, label and handlers, without style overrides.

Horizontal groups wrap. At narrow widths, preview actions precede saving actions;
supporting editor content follows the main fields. Avoid page-wide horizontal
scrolling at 320px and 200% zoom. No new fixed editor toolbar is required.

List rows share areas for optional thumbnails, title/summary, metadata, status
and optional ordering actions. List-row action buttons are limited to Move up
and Move down for collections that support manual ordering. Delete and
Unpublish belong in record editors. Publications and Projects both offer
Move up/down through shared CmsOrderActions. Media, ordering,
publication filters and other entity-specific
controls remain optional without changing the overall arrangement.

Fullscreen previews share one presentation frame: replace the admin shell,
show only the edited section/view, use the public rendering components, and
position the unstyled HeroUI CloseButton top-right through its wrapper. Share
Escape handling, editor focus/scroll restoration and unsaved-value continuity.
Publications retain separate card and article/destination actions. Heavy scenes
mount only when preview opens. Public component admin props retain their explicit
live/preview type contracts.

Apply this layout to Publications, Projects and Hero first, then use it for
About, Social and SEO. Preserve each entity's existing save/publish semantics.
Prefer small presentation components composed with entity-specific content;
do not introduce schema-driven forms or a new state architecture.

Shared components accept typed content and behavior; choose composition over
per-consumer mode/appearance flags. Contact's live wrapper and CMS composition
reuse the same layout and form primitives with different social-link data and
completion children. ImagePicker accepts a preview child. Avoid a generic form
engine or configuration-driven replacement for these small compositions.

CmsShell owns a single navigation definition (section IDs, labels, paths and icons).
It navigates directly through the router. Editors do not intercept navigation
or register per-screen navigation callbacks.
Consumers do not repeat one callback and hardcoded route per navigation item.
Desktop sidebar and mobile drawer share this same navigation path.

Shared presentation lives in `src/components/cms/CmsLayout.tsx`. Editors retain
entity-owned working values and request handling. `CmsPreviewFrame.tsx` owns the
preview frame and shared lifecycle hook; each editor captures its initiating
control and scroll before replacing the shell. Previews use the document scroll
context so public sticky content and reading progress can observe scrolling.
On exit the remounted editor restores its initiating control and scroll position.
Heavy public scenes remain behind their existing on-demand preview boundaries.

### Shared presentation reuse and HeroUI alignment

Reuse the existing UI wrappers first, then installed HeroUI components for
matching controls. Use native or custom interactive controls when they have a
specific browser or product requirement; document the reason at the owning
component or in this spec. Ordinary semantic layout, headings and status regions
do not require library wrappers. Keep semantic theme tokens and the repository's
field/button icon policy when composing or adapting library components.

CMS screens supply content, values and handlers to shared controls. Keep control
appearance and spacing in the owning shared component; callers do not pass
`className` or descendant selectors to restyle it. If a meaningful variation is
needed, implement a named semantic variant at the shared component. Ordinary
entity-specific content markup can retain its own layout classes.

The following presentation components in `CmsLayout.tsx` own shared layout
classes across Publications, Projects and Hero:

| Shared piece | Responsibility | Consumers |
| --- | --- | --- |
| CmsEditorContent | Own full-width single-column content or the main/18rem-supporting-column grid, gap-10 spacing and responsive stacking; omit absent supporting panels | Publication and Project fields; single-column Hero |
| CmsFieldSection | Own heading hierarchy, optional description, field spacing and optional section separator; accept entity fields as children | Content, Cover/Screenshot, Publishing and Hero stage sections |
| CmsEmptyState | Own spacing, heading/description and optional action presentation; accept distinct empty-library/no-results messages | Publications and Projects |

Compose these with the existing CmsShell, CmsPageHeader, CmsToolbar,
CmsCollectionToolbar, CmsFeedback, CmsFooter, CmsDemoControls, record rows and
CmsPreviewFrame. Prefer small presentation components rather than a universal
page configuration. Keep entity-specific fields, preview adapters, action
composition and mock save/publish/filter state with their current owners. Avoid
a new form engine, state layer, dependency or changes to public rendering.

HeroUI controls are composed as below. Existing wrappers for Button,
Input, TextArea and Chip remain the first reuse point; existing Modal, Drawer,
TextField/Label/Description/FieldError and CloseButton usage stays library-owned.

| CMS control | Shared implementation | Preserve |
| --- | --- | --- |
| Status filter in CmsCollectionToolbar | HeroUI Select, composed once for both lists | Visible Status label, choices, combined filtering and disabled-ordering rules |
| Decorative-image and demo-failure checkboxes | CmsCheckbox composes HeroUI Checkbox | Accessible labels, controlled values, disabled state and failure recovery |
| Publication-type and Project-platform choices | CmsRadioGroup composes HeroUI RadioGroup / Radio | Group labels, keyboard operation, selected values and hidden-field preservation |
| Publication/project status badges | Existing HeroUI-backed Chip wrapper | Status wording, wrapping and semantic theme colors |

`CmsRadioGroup` owns label typography, option wrapping/gaps and radio target
sizing; callers supply typed options, values and handlers. `CmsBackButton` owns
the ghost treatment, leading ArrowLeft and spacing above the header for both
editors and unavailable-record recovery. ArrowLeft remains the existing
navigation exception to the icon-free ghost-button default. `CmsShell` renders
navigation entries through one shared button composition with shared spacing,
active treatment and icon sizing.

Select and Accordion retain their library-owned disclosure indicators to identify
available options and expanded/collapsed state. Checkbox and Radio retain their
library-owned selection indicators. No decorative icons are added to field
labels or ghost actions. Native-select test queries should instead open the
Status trigger and choose its labelled option; keep assertions on filtering and
ordering outcomes.

Keep the image picker's native file input: the browser owns device file
selection, while the existing picker owns read/decode, cancellation, replacement
recovery and preview behavior. Do not replace public rendering components or
plain semantic layout with custom imitations of library components. New native
exceptions need a concrete reason; a matching HeroUI control is the default.

Acceptance preserves the existing screen order, icon decisions, local working
values, dirty/save/publish/discard semantics, search/status filters, ordering,
image replacement and preview lifecycle. Presentation changes need controller
review at desktop and 320px/200% zoom, in both themes, with keyboard/focus and
reduced motion. Reuse focused behavior tests and update accessible queries as
needed for library-owned interactions; do not test incidental markup or classes.
Build/browser/accessibility/performance verification ownership remains governed
by CONSTRAINTS.md. Existing on-demand heavy-preview criteria remain unchanged.

### Collection search and filter contract

Publications and Projects use one toolbar presentation so moving between lists
keeps search and filtering predictable. `CmsCollectionToolbar` provides the
shared controls while each list retains its own local filter values. Match
toolbar borders, padding, gaps,
search width, visible label styling, control height and responsive behavior.
Search sits on the left; applicable filters sit on the right. At narrow widths,
groups wrap with search first and filters below, without horizontal page scroll
at 320px or 200% zoom. Do not reserve empty filter panels for future collections.

| Control or area | Publications | Projects |
| --- | --- | --- |
| Search label | Search publications | Search projects |
| Search fields | Title and summary | Name and summary |
| Status label | Status | Status |
| Status choices | All publications, Published, Drafts | All projects, Published, Drafts |
| Feedback below toolbar | Matching record count and operation feedback | Matching record count and operation/ordering feedback |

Both search inputs use the same searchbox treatment and a leading decorative
Search icon, chosen over ListFilter because the input performs text lookup.
Status uses a labelled HeroUI Select with its built-in dropdown affordance; an additional
Filter/ListFilter icon would repeat the visible context. No separate search
submission button is needed: results update from local mock values as controls
change. Additional entity-specific filters may join the same right-hand group
when required; do not invent filters solely to fill space.

Search trims surrounding whitespace and matches case-insensitively. Search and
Status combine: Published includes every item with a demo-published snapshot,
including items with unpublished draft changes; Drafts includes items without a
published snapshot. The All choice applies no status restriction. Filtering
changes neither saved values, published snapshots nor record order.

The feedback area reports the matching count and operation results. Distinguish
an empty collection from no matches. With no matches in a nonempty collection,
an icon-free ghost Clear filters action resets both search and Status to All.

Publication and Project Move up/down actions remain in their record rows. Both
use CmsOrderActions and CmsOrderHint for consistent control and feedback styling.
Disable ordering when
trimmed search is nonempty, Status is not All, or a request is pending, even if
all records happen to match. Explain that filters must be cleared to reorder;
restore the existing boundary rules when filters are cleared. Reordering always
uses the full collection order rather than positions in filtered results.

Verification: visual review checks matched controls, wrapping, themes and keyboard
access. Focused behavior tests protect combined search/status results, clearing
both controls, published-with-changes classification, and preserving order while
reordering is disabled in filtered results.

### Collection section previews

Publications and Projects list headers offer Preview publications / Preview
projects beside New, composed through CmsCollectionActions. These outline actions
use leading Maximize2 rather than Eye to match existing fullscreen preview
entry points. Keep the shared header action-group spacing and responsive wrapping;
search and Status remain in their established toolbar areas.

Preview the entire respective section using demo-published snapshots, regardless
of the current admin search or Status filter. Exclude draft-only and unpublished
records and saved draft revisions that have not been published. Both collections
follow their current full demo order. This is a preview of demo content; it does not change
the real homepage's content source. Show a clear empty state when nothing is
published rather than substituting fixtures or draft values.

The root page and previews reuse ProjectsSection and PublicationsSection from
`src/components/home-sections/`, including the same SectionHeading,
SectionContainer, ProjectItem stack and PublicationCard grid/sticky treatment.
Public components accept typed presentation data and contain no CMS state.
The root retains its fixtures, section order, glass surface and navigation.
Preview only the selected section, without the hero, About or page navigation.
PublicationsSection's named standalone layout removes the negative margin used
to overlap the following public section while retaining its sticky scroll runway.

Both collections use CmsPreviewFrame/useCmsPreview: replace the admin shell,
focus the unstyled HeroUI exit control, support Escape, and restore the same list
filters, order, focus and scroll on exit. Opening/closing never saves, publishes,
unpublishes or changes snapshots. Load preview modules on demand; project scenes
mount only while their section preview is open. Errors retain demo content and
offer reopening the preview.

All preview links use ordinary browser navigation. External/project links follow
their live destinations, including modified and middle clicks. Local publication
cards use the current public article route `/publication-details-lab`; dynamic
public article routing remains deferred. Hero Work uses `/#work`. No link
confirmation, click interception or internal article substitution is used.

Test scope is level 2 for published/draft isolation, filter/order/focus/scroll
continuity, native link behavior and on-demand scene mounting. Controller
review covers visual fidelity, sticky scrolling, project popovers, actual GPU
rendering, both themes, keyboard, 320px/200% zoom and reduced motion. Performance
remains possible: no project canvas/assets before opening the preview and no
unchanged device asset downloads after revisiting it. Build and browser checks
remain controller-owned under CONSTRAINTS.md.

## Publication flow and state contract

1. List existing fixtures from `app/lab-publications.ts`, combining the local
   article body from `src/components/publication-details/sample-publication.ts`. Search title/summary
   case-insensitively; combine it with draft/published filtering. Distinguish an
   empty library from no matching results. New publication opens an empty draft.
2. Group editor fields into Content, Cover, and Publishing. An explicit
   Local article / External link choice exposes the relevant content field.
   Preserve hidden values when toggling types; validate only the active type.
3. Maintain provider-owned working drafts, last in-memory saved draft, and published
   snapshot. Edits never mutate the published snapshot. Save updates the draft;
   publish validates and copies the current working values into both snapshots.
   Unpublish removes only the demo-published snapshot after confirmation.
4. Draft save permits incomplete content. Publish requires nonblank title,
   summary, selected cover, publication date, and either nonblank local body or
   a valid HTTPS external destination. Future dates show a scheduling-not-supported
   error rather than suggesting scheduled publishing. Required image descriptions
   have an explicit decorative-image opt-out. Do not invent arbitrary text limits.
5. Request states: idle, pending, success, error. Disable duplicate submissions.
   Capture the submitted snapshot: changes typed during a pending save remain
   dirty after completion. Failures preserve values and provide retry. Tests inject
   deterministic request failures without testing controls in the UI.
6. Every field change updates its provider-owned working draft immediately.
   Navigation proceeds without interception, confirmation or unload warnings.
   Working drafts survive CMS editor unmounts, including invalid/incomplete values
   and new records. Reload persistence is deferred.
7. Opening or closing previews does not save, publish or reset values. Restore
   the previous form values and useful focus on return.

List rows identify title, local/external type, publication state, and date.
A published item with a different saved draft shows “Published · Unpublished
changes”; unsaved changes have a separate indicator. Save draft does not publish.
Use Publish for first publication and Update published for subsequent changes.
Existing sample content may be seeded as demo-published; this is not a claim
that these records exist in a production CMS. Delete is excluded from milestone
one; no destructive control should be presented without implemented behavior.

## Shared editor behavior

Hero, About, Contact and SEO defaults use working values and a last demo-saved snapshot.
SEO path overrides use their own demo-saved records.
Save changes validates and commits the submitted values in the demo; errors retain
input and offer retry. These screens have no separate draft/publish controls in
this phase. Hero/About offer public-component previews; Contact composes the full public contact section;
SEO offers a metadata summary. All show unsaved changes consistently. Projects
follow the publication draft/publish distinction, with project-specific fields.
Comment editing and moderation are excluded. Reusing Markdown input utilities
never introduces CommentMarkdown into PublicationDetails or makes comments editable.

### SEO defaults and path-level override collection

SEO uses the same collection-to-editor structure as Publications and Projects.
Global defaults are separate from a list of path-level override records; do not
place every page's fields or a publication selector on one singleton form.

| Screen | Responsibility |
| --- | --- |
| `/admin/seo` | Searchable override list; Edit defaults and New override header actions |
| `/admin/seo/defaults` | Edit and demo-save the global title/description |
| `/admin/seo/new` | Create an override with an exact site path and at least one override field |
| `/admin/seo/[id]` | Edit a stable-ID override; show effective metadata or delete it |

Every saved row represents an actual override. A path record contains a stable
demo ID, a unique site-relative path, and at least one nonblank title/description
override. Each individual field is optional, but both cannot be blank. Homepage (`/`), Contact (`/contact`) and local article
paths use this same record type. Seed `/contact` and `/publication-details-lab`
with their existing metadata as demo fixtures. Homepage has no placeholder record:
paths without a saved record inherit global defaults. A real override for `/` can
be created when a title or description needs to differ from the defaults.
Do not invent publication slug routes. External publication destinations are not
site paths and do not receive local SEO override records. A custom path may be
entered for demonstration; an override does not create a public page.

Paths start with one `/` and identify an exact pathname. Reject full URLs,
protocol-relative paths, query strings, fragments, backslashes, whitespace,
dot-segment paths and duplicate normalized paths. Normalize a trailing slash
except for `/`; preserve case. Equivalent percent-encoded unreserved characters
share a normalized path; reject encoded separators and dot segments rather than
letting URL parsing silently change their destination. Wildcards, route patterns and prefix matching are
outside this iteration. Path validation must not silently change the intended
destination. IDs remain stable when paths are edited.

The list reuses CmsPageHeader, the shared collection toolbar in search-only mode,
CmsFeedback, CmsRecordRow/CmsRecordLink and CmsEmptyState. Search matches path and
saved override text case-insensitively. There are no Custom/Inherited filters or
aggregate status badges: every saved row is an override. Per-field Default/Override
sources remain useful inside the editor. Rows show the path, effective title and
description summary. List changes do not edit records. Distinguish an empty
collection from no matches; Clear search resets the search field. There is no
manual ordering, list-row Delete or collection preview. Header actions retain the
shared layout and wrapping. Publications/Projects retain their existing required
status controls; the shared toolbar's typed SEO variant has search only.

Both defaults and record editors follow Header → Toolbar → Feedback → Content →
Footer. Saving actions belong in the toolbar; footer
Discard is left and applicable Delete is right. Editors have Back navigation.
Use the shared full-width single-column layout and field/control compositions.
The record editor shows Path, SEO title override and description override, followed
by a plain effective metadata summary. Default title and description are required;
override fields are optional independently, with at least one required per record.
A blank or whitespace-only individual field inherits the corresponding global
default. Saving both fields blank is rejected for new and saved records, preserving
input and the saved snapshot. To use both defaults for a path, delete its override. Effective summaries show each value and
Default/Override source. Missing working defaults show Not set in the summary only.
No arbitrary text-length limits or exact search-rendering promises are included.

Delete is available only for saved records in the editor's right footer group.
Confirmation identifies the path and explains that the demo override is removed
and defaults apply; it does not delete a public page. Cancel/failure preserve values,
pending deletion blocks duplicates/dismissal, and success returns to the SEO list.
Never-saved records have no Delete action. There is no separate Reset action and
no saved record whose sole purpose is to represent inheritance.

SeoProvider retains only demo-saved defaults and path records across CMS
navigation. Each provider retains working drafts; editors own validation and request feedback. Save changes
captures the submitted values; later edits remain dirty. Failures retain edits for
retry. New/unknown record IDs have clear recovery UI. Reload restores fixtures.
Navigation does not validate or prompt. Saved values, deletion and default changes never alter publication
content drafts, published snapshots, external sites or live Next.js metadata.
No backend, persistence or generic form/state framework is introduced.

Defaults mirror the current root metadata. Contact and the local article fixture
retain their current metadata as overrides; Homepage initially inherits defaults.
Changing a global default immediately changes effective values for inherited
fields, while explicit record overrides remain intact. The collection and summaries
report demo working/saved values as appropriate, without claiming a live SEO result.
SEO follows Contact in desktop/mobile Content navigation; navigation is direct.

Title fields consider Type/TextCursorInput and omit icons because labels suffice;
description textareas and ghost Discard follow the icon-free default. Path
uses leading Route over Link to identify a site pathname; search retains Search.
New override uses Plus over FilePlus2 and Save retains Save over Check. Defaults
navigation uses Settings2 over SlidersHorizontal. Back reuses CmsBackButton.
Delete reuses CmsLifecycleButton/CmsDialog and the existing footer/confirmation
icon decisions. SEO navigation
retains Search over FileSearch under the existing ghost-navigation exception.

Risk level 2: exact-path validation/uniqueness, per-field inheritance and the nonblank-record rule,
record/default isolation, pending-save snapshots, failure/deletion recovery and
dirty navigation. Performance none: static text and small local collections.
Controller reviews build, list/editor consistency, keyboard/focus, path validation,
discard/delete, both themes, 320px/200% zoom and unchanged public metadata.

### Contact URL editor and full contact preview

`/admin/contact` edits the GitHub, LinkedIn and X HTTPS destinations in one
screen. Labels and the built-in accent-colored icons stay fixed in code.
There are no custom profile records, image controls, create or delete actions.
`/admin/social`, `/admin/contact/new` and `/admin/contact/[id]` redirect to this
editor for existing links.

Each URL must be complete HTTPS without sign-in credentials. SocialProvider
retains the last demo-saved destinations across CMS navigation. Saving captures
the submitted URLs; newer edits remain dirty, failures preserve values and retry
is explicit. Discard restores saved values and clears validation/feedback.
Working drafts survive editor unmounts without navigation prompts. Reload restores
fixtures. There is no backend, durable storage or inquiry inbox.

Preview replaces the CMS shell through CmsPreviewFrame and shows the full public
contact section with the working URLs and three-step form. Invalid
URLs remain unavailable and are identified by a status message. Preview entry/exit
does not save or discard; it restores values, initiating focus and scroll.
Profile links navigate directly with their public target and rel attributes.

The public and CMS views compose ContactSection, ContactIntroduction,
ContactConversationForm, ContactCompletion and SocialLinks. ContactConversationSection
remains a convenience composition for the live page, preserving its original props,
default links and submission callback. The form owns validation and step/submission
state, accepts an optional submission handler and renders its completion children.
The CMS composition supplies no external submission handler and provides neutral
completion content. Public components contain no CMS/preview mode flags
or CMS imports. Profile data stays typed data; layout and content choices use
composition rather than consumer-specific configuration props.

URL fields retain leading Link over ExternalLink to identify destinations.
Preview contact retains Maximize2 over Eye; Save retains Save over Check.
Ghost Discard remains icon-free. Contact navigation retains MessagesSquare.

Risk level 2: URL validation, pending-save snapshots, save recovery, dirty
navigation and form/link preview continuity. Performance none: the fixed three
links avoid image loading or collection growth. Controller checks build,
desktop/320px/200% zoom, themes, reduced motion, keyboard/focus and unchanged
live contact behavior.

### About editor and preview

`/admin/about` edits Heading and Biography using the full-width shared editor
layout. Heading is a single-line text field; Biography is plain multiline text,
preserving line breaks. Both require nonblank content on Save changes, with no
arbitrary text limits. Validation retains input and the saved snapshot; toolbar
Save focuses the first invalid field. Navigation never validates or prompts.

AboutProvider retains the last saved snapshot and working draft across CMS
navigation; AboutEditor uses that draft directly. Reload restores the public
fixtures. Saving captures the submitted values, blocks duplicate requests and
leaves newer edits dirty. Request failures retain values for retry. Feedback says
Saved. Discard changes
restores the last saved snapshot and clears validation and request feedback.
There are no publish/unpublish/delete actions for this singleton.

AboutPreview mounts on demand inside CmsPreviewFrame and uses the existing
AboutCtaSection with typed heading/summary props. Public defaults live in
`src/components/about-cta/about-content.ts`; the existing summary prop and default
public callers retain their content and behavior. The CMS biography maps to
summary, with visibly identified preview-only placeholders for missing fields.
The public renderer imports no CMS code. Preview exit restores working values,
the Preview trigger and scroll without saving. The fixed Start a conversation CTA
navigates directly to `/contact`. The CTA label, destination, icon and animation remain
in public code.

About follows Publications in the shared desktop/mobile Content navigation.
Existing editors navigate directly to About without confirmation.
Heading considers Type/TextCursorInput and omits an icon because the visible label
suffices; Biography and ghost Discard follow the icon-free default. Save uses
leading Save rather than Check; Preview uses leading Maximize2 rather than Eye.
About navigation uses leading UserRound rather than BadgeInfo under the existing
navigation exception for ghost buttons. Public CTA styling remains library-owned.

Risk level 2 covers failed saves, edits during pending requests, saved-value
retention across navigation, validation, direct links and preview continuity.
Performance is possible because the public reveal animation mounts on demand:
controller checks responsive typing/scrolling and repeated preview visits with a
long biography, ensuring prior reveal effects are cleaned up. Controller also
reviews desktop/320px/200% zoom, both themes, reduced motion and keyboard/focus.

### Hero validation and preview destinations

Hero Save changes requires nonblank eyebrow, headline and tagline/description
for every fixed idea, iterate and solution stage. Whitespace-only values are
invalid; there are no arbitrary text-length limits. Inline field errors preserve
the entered values and leave the last demo-saved snapshot unchanged. Toolbar
validation focuses the first invalid field in editor order. Discard restores the
saved values and clears validation and request feedback.

Request failures retain values and allow retry. Edits typed during a pending
save remain in the working draft afterward, including after navigation away and
back. Hero preview renders PrismHeroLayout directly. Work navigates to `/#work`
and Hire to `/contact`; no click interception or link confirmation is used.
Preview exit restores editor values, initiating focus and scroll.

### Working drafts and navigation

All six providers retain per-editor working drafts using
`src/cms/working-drafts.ts`. Fields update their draft on change, without a
request, debounce or validation gate. Existing records use their record ID; new
editors retain a generated identity so revisiting does not duplicate the draft.
Drafts are isolated by entity and record. Manual Save captures a separate
submitted snapshot; Publish remains explicit. Discard restores the last saved
values. No navigation guard, beforeunload listener, Stay/Save-and-leave dialog,
link interception or link-confirmation dialog remains. Navigation proceeds even
with incomplete values or a pending request. Reload and cross-document
persistence remain future work. Delete and Unpublish keep their action-specific
confirmations. Tests for removed interception behavior are replaced by draft
retention and native-link navigation tests.

## Reuse and preview architecture

Use typed content props and adapters to map editor values to existing component
contracts. Keep CMS imports and state out of public component modules. Extract
hardcoded hero/About/social content only as needed, preserving current defaults
and existing public callers. Do not duplicate article or card markup.

Illustrative boundary, not a new dependency or final persistence schema:

```tsx
interface PublicationPreviewProps {
  publication: PublicationDetailsData;
}

export function PublicationPreview({ publication }: PublicationPreviewProps) {
  return <PublicationDetails publication={publication} />;
}
```

The Markdown field currently previews using CommentMarkdown, which is restricted
for comments. Reuse its input/formatting utilities where suitable, but article
preview must use PublicationDetails and its existing Markdown renderer, heading
IDs, table of contents, and reading progress. Do not silently broaden comment
rendering. Article images, code, tables, headings, and links must remain supported.

Publication previews are fullscreen only. Full-screen preview stays in the current
editing session, shows only the section or publication view being edited, hides
CMS chrome, and restores the editor on exit without losing values or staged
images. Keep the public component's responsive rendition. Show only a subtle
fixed HeroUI CloseButton using its default appearance without style overrides; do not
add a fixed toolbar or other persistent preview UI.
Publications have separate card and detail previews (external items use a
destination summary in place of a local article). Use the actual viewport and a
document scroll context compatible with public components. Verify sticky
positioning, table of contents, reading progress, portals, focus and scroll
restoration. If an isolated iframe is needed for fidelity, choose its transport
during implementation; do not introduce cross-tab storage merely to achieve
full-screen presentation.
Image selection accepts JPEG, PNG and WebP up to 10 MiB for this demo.
Read and decode locally before replacing the current image; failures preserve it.
Use data URLs in mock values so previews and saved drafts outlive the picker
without object-URL ownership machinery. Abort pending reads when leaving the
picker and ignore superseded decoding results. Images are never uploaded.
No IndexedDB, separate-tab snapshot transport or session cleanup is required.
Separate-tab previews and persisted drafts remain deferred product decisions.

Missing draft values use visibly identified preview-only placeholders; never
write them back into editor values or pass invalid dates to public renderers.
External publications offer card and destination summary previews, not an iframe
or fabricated local article. Real contact/comment submissions are absent from
preview. Confirm before navigation out of the preview; links are not globally
disabled. Leaving full-screen preview returns to the same working editor values.

Mount heavy 3D previews only when opened. Keep stage identity stable during field
updates; content changes must not reload device assets or recreate the canvas.
Preview only the edited section, including Hero; do not add surrounding public
page sections to the preview. Performance classification: possible. Acceptance: no 3D canvas mounts
while its preview is closed; text edits do not remount an open canvas or reload
unchanged assets. Controller verifies with lifecycle instrumentation/browser data.

## Proposed implementation locations

| Path | Responsibility |
| --- | --- |
| `app/admin/` | Guarded prototype routes, shell and preview entry points |
| `src/components/cms/` | Forms, lists, media selection, status and navigation UI |
| `src/cms/` | Typed editor values, fixtures and local mock interactions |
| Existing public components | Presentation reused through content props |
| Colocated `*.test.ts(x)` | Focused behavior contracts |
| `local-workspace/` | Implementation plan, checklist and runtime evidence |

Use existing Next.js 16.3.4, React 19.2.8, TypeScript, HeroUI 3.2.6, Tailwind 4,
Lucide, react-markdown and Vitest. Verify package.json at implementation time.
Read relevant installed Next.js guides under `node_modules/next/dist/docs/`
before coding routes, client/server boundaries, metadata or navigation. Use named
exports, typed props and existing wrappers; no new UI/editor/state dependency is
assumed. Refactor shared components only as required for this content boundary.

## Field and button icon decisions

Leading icons unless stated otherwise. Retain visible labels; icons are decorative.

| Control | Candidates | Decision and reason |
| --- | --- | --- |
| Search publications/projects | Search, ListFilter | Search; matches text lookup |
| Title/name/headline/eyebrow/heading | Type, TextCursorInput | Omit; repeated across form and adds noise |
| URL fields | Link, ExternalLink | Link; denotes field value rather than navigation |
| Date | CalendarDays, Calendar | CalendarDays; use native picker affordance if present instead of duplicating |
| Tags | Tag, Tags | Tags; identifies the collection |
| Alt text | Image, Accessibility | Omit; image context and visible label suffice |
| New publication/project | Plus, FilePlus2 | Plus; consistent creation action |
| Save draft/content | Save, Check | Save; action rather than completion state |
| Publish/update published | Send, Upload | Send; distribution action |
| Unpublish | Archive, EyeOff | EyeOff; withdraw visibility without deleting |
| Full-screen preview | Maximize2, Eye | Maximize2; expands the current preview |
| Choose/replace image | Upload, ImagePlus | Omit; native file chooser already identifies the action |
| Remove image (ghost) | Not needed | No icon; default policy |
| Navigation drawer | Menu, PanelLeft | Menu; conventional mobile navigation |
| Back to publications (ghost) | ArrowLeft, ChevronLeft | ArrowLeft exception; identifies navigation out of the editor |
| Light/dark mode (ghost) | Sun/Moon, SunMoon | Sun/Moon exception; identifies the destination mode |
| Add existing tag (ghost) | Not needed | Text-only default; the tag label is sufficient |
| Back to editor / Discard | ArrowLeft, RotateCcw | Omit; explicit text already identifies the destination/action |
| Open link | ArrowUpRight, ExternalLink | ArrowUpRight trailing; confirms navigation to a separate tab |

Textareas and ghost buttons are icon-free by default. Edit/Preview tabs are text
labels. For new controls not listed, apply the repository policy and record the
decision before implementation rather than silently assigning decorative icons.

## Verification and acceptance

Risk level 2: pending-save races, draft/published isolation, dirty navigation,
preview state preservation, and image replacement recovery require focused
behavior tests at the lowest useful layer. Test observable results, not styling
classes or internal object shapes. Level 0 visual grouping/copy needs visual
review; no blanket coverage target or tests that merely mirror field markup.

Milestone-one acceptance:

1. Search/filter/create/edit works with the actual publication fixtures, including
   external publications; empty and no-results states are distinct.
2. Unsaved values reach both previews without changing saved/published values.
   Preview returns to editing without loss, including staged images once image replacement is implemented.
3. Save/publish success and failure are truthful demo states; retry preserves
   input, duplicate requests are blocked, and edits made while saving stay dirty.
4. Publish validation focuses the first invalid field; incomplete draft preview
   does not crash or persist placeholder values.
5. Full-page previews use public components with native responsive/scroll behavior
   and contain no real submissions. Exiting full-screen preview restores the editor and useful focus.
6. Public routes retain existing content, behavior, and rendering. Prototype stays
   disabled on production by default and contains no secrets/private content.
7. Keyboard access, labels, focus return, announcements, 320px/desktop layouts,
   200% zoom, both themes and reduced motion pass controller inspection.

Agent commands after implementation (choose actual focused test paths):

```sh
pnpm exec vitest run src/components/cms src/cms
pnpm exec tsc --noEmit
git ls-files --cached --others --exclude-standard -z -- '*.js' '*.jsx' '*.mjs' '*.ts' '*.tsx' | xargs -0 pnpm exec eslint --
```

Controller-only unless explicitly delegated, per CONSTRAINTS.md:

```sh
pnpm build
pnpm dev
```

No builds, dev servers or browser runs belong to this documentation handoff.
Before implementation, review the editor layout and full-screen preview behavior.
Before adding uploads, settle format/size limits; before deployment, settle access control. These are proposed
UI implementation choices, not previously confirmed user requirements.

Always preserve unrelated changes and public behavior; never weaken constraints,
add skipped tests/suppressions, or present simulated operations as real storage.
Revisit scope before adding dependencies, authentication, backend services, or
publishing this prototype. Handoff does not authorize external messages or deploys.

## Local prototype entry

Open `/admin` in the development server; it redirects to `/admin/publications`.
Development enables the demo automatically. Production returns not-found unless
the server-only `CMS_DEMO_ENABLED=true` flag is explicitly set. This flag is for
controlled demo review and is not authentication. The provider retains saved and
published demo values across CMS navigation; reload resets them. New draft links
cease to exist after reload and show a recovery message.

Hero, Projects, Publications, About, Contact and SEO appear in navigation.
The shell has no dead links.
Cover selection supports local files and existing fixture images. Full-screen
preview stays in the same tab and uses native document scrolling.

## Publication management details

Publication ordering is local mock behavior: Move up/down swaps whole records in
the existing CmsProvider collection, preserving draft and published snapshots,
images, dates and other values. First/last boundary actions are disabled; active
search, non-All Status and pending requests disable all ordering. Successful
moves announce the new position, and filtering never changes the underlying
order. Clearing filters restores the same order and normal boundary controls.
Published section previews follow this order while excluding unpublished items.
Reload restores fixture order; ordering makes no mock request and does not
change real homepage delivery or introduce backend/persistence contracts.


Tags accept comma-separated input and existing-topic suggestions. Selected tags
are shown once, ignoring case, with explicit Remove actions; removal clears all
case variants of that tag. Hidden article/URL values survive type switching.
The editor status reflects current working values against the demo-published
version; list status reflects the saved draft against that version.

Delete is available in the publication editor's right footer group for saved
records, alongside Unpublish when applicable. Publication list rows link to the
editor and contain no Delete action. Confirmation uses CmsDialog, names the
publication and explains that its saved draft, published demo version and current
edits are removed. Cancellation leaves it unchanged. Pending requests block
repeat deletion and dismissal; failures keep confirmation open for retry and
leave records and working editor values intact. Success from the editor returns
to Publications. Reload restores fixtures; deletion never affects the real website.

Icon decisions: editor-footer Delete uses text-only `danger-soft`
buttons. Trash2/X were considered for these entry points; omit an icon because
the explicit label and danger treatment suffice. Tag Remove remains an icon-free
ghost button. For the confirmation's “Delete in demo”, Trash2 was chosen over X,
leading and decorative,
because it distinguishes deletion from closing the dialog. Tags retains its
existing Tags input icon (rather than Hash) to match the established field.

## Project editor

`/admin/projects` lists the current Field Notes/Relay fixtures with screenshots,
platform and saved publication status. Search matches name/summary and combines
with the shared All/Published/Drafts status filter. Create and
edit routes expose name, summary, What, How, mobile/web platform, screenshot,
image description/decorative choice and live URL. Fixture image descriptions use
“[project name] interface” as editable demo defaults.

Draft saves permit incomplete content. Publishing requires name, summary, What,
How, screenshot, image description unless decorative, and a complete HTTPS URL.
Mock saved drafts and published values are distinct. Request failures preserve
edits; changes typed during saving remain dirty. Unpublish preserves the draft.
Delete requires confirmation, removes both demo versions and returns to the list;
failed deletion can be retried. New or missing records have clear recovery UI.

Both editors retain provider-owned working drafts across direct CMS navigation.
Shared navigation reflects the current section on desktop and mobile.
Reload persistence is deferred.
Public ProjectItem previews and ordering belong to the following iteration.

Project icon decisions: Name (Type/FolderKanban) and image description
(Image/Accessibility) omit icons because nearby context suffices. Live URL uses
leading Link rather than ExternalLink to identify the field; Search uses Search
rather than ListFilter. New uses Plus rather than FilePlus2. Save/Publish and
Unpublish retain Save/Send/EyeOff rather than Check/Upload/Archive to match
publications. Delete confirmation retains Trash2 rather than X. Discard
(Undo2/X) omits an icon because its confirmation context supplies meaning.
Ghost controls are icon-free except Back (ArrowLeft rather than ChevronLeft for
direction) and section navigation (FolderKanban rather than Layers for Projects;
BookOpen for Publications), which preserve recognizable navigation cues.

### Project preview and ordering

Project editors open an on-demand preview of current unsaved values through the
public ProjectItem, including What/How popovers and the selected web/mobile device.
Missing text uses identified preview-only placeholders; a missing screenshot
shows an untextured device. Returning preserves edits, restores editor scroll and
focuses the Preview project button. Publishing invalid content returns to fields
and focuses the first error. Device loading failure leaves an editor return path.

The preview module is dynamically loaded only when opened. Device geometry and
textures retain the public renderer's URL-keyed loader caches; text changes do
not introduce new asset URLs or clear caches. Closing unmounts the canvas.
Links require a complete HTTPS URL and a confirmation before opening a new tab.

The list provides Move up/Move down buttons for all demo records. Moving changes
session order immediately without changing drafts or published snapshots.
Boundary actions and ordering during active search/status filters or pending
requests are disabled;
a live status announces the new position. Reload restores fixture order.
Public website ordering remains unchanged by the mock.

Icon decisions: Preview project considered Eye/MonitorPlay; leading Eye matches
the preview action without implying video playback. Open link considered
ArrowUpRight/ExternalLink; trailing ArrowUpRight matches publication previews.
Return to editor and Move up/down are ghost buttons with text-only labels.
