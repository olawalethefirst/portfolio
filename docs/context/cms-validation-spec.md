# CMS validation contract

## Scope and decision

Use Zod for typed content rules and HeroUI Form, TextField and FieldError for
form semantics and accessible feedback across About, Hero, Contact, SEO,
Projects and Publications. The six CMS editors and their providers share
the action-specific schemas described below. Preserve the content and lifecycle
contract in [cms-ui-spec.md](cms-ui-spec.md).

Provider-owned working drafts remain the source of controlled values. Every edit
updates them immediately, including invalid and incomplete values. Validation
must never gate draft retention, rewrite input on each keystroke, or create a
second draft store. Editor validation metadata may reset on remount; content
survives editor unmounts and reloads through the shared
[local draft store](cms-local-drafts.md). Shape-only restoration schemas accept
invalid and incomplete input without weakening action-specific validation.

Backend/API implementation, authentication, databases and remote persistence remain out
of scope, as do public contact/comment forms. Do not add React Hook Form,
TanStack Form, a generic form engine, navigation guards, unload warnings,
mock notices or testing controls. Preserve layouts and existing field/button
icons. New controls follow the [icon policy](field-and-button-icon-policy.md).

## Content rules and actions

| Area | Action requirements |
| --- | --- |
| About | Save requires nonblank `heading` and `biography`. |
| Hero | Save requires nonblank `eyebrow`, `headline`, and `tagline`/`description` for each fixed stage: `idea`, `iterate`, `solution`. |
| Contact | Save requires all three fixed destinations: `github`, `linkedin`, `x`. Use the existing Contact HTTPS acceptance policy for both save and preview links. |
| SEO defaults | Save requires nonblank `title` and `description`. |
| SEO override | Save requires a valid exact normalized `path`, unique among current records excluding the current ID, and at least one nonblank title/description. Individual blank fields inherit. |
| Project draft | Save accepts structurally valid incomplete content, including blank or unfinished publication fields. |
| Project publish/update | Require nonblank `name`, `summary`, `what`, `how`, `screenshot`; require `screenshotAlt`; require an HTTPS `liveUrl`. |
| Publication draft | Save accepts structurally valid incomplete content, including blank or unfinished publication fields. |
| Publication publish/update | Require nonblank `title`/`summary`, a cover, a valid date no later than today, `coverAlt`, and nonblank `bodyMarkdown`. All publications are internal articles. |
| Delete/unpublish | Preserve existing confirmations and request coordination; publication completeness must not block either action. Unpublish retains saved draft and current edits. |

Structural draft schemas check domain shapes, strings, booleans and enum values;
they do not apply publication completeness or reject unfinished URL/date text.
Publications have no kind or external destination; article content is always the
publishing target. Legacy draft restoration strips obsolete fields without
dropping retained article text.
Tags remain optional and retain existing parsing/normalization. Publication
publish/update applies the approved tag length and count limits in the
[homepage text limit map](cms-homepage-text-limits.md).

### Preserve acceptance and normalization

- Nonblank checks use trimmed text to determine emptiness, without trimming the
  stored input. Apply only the approved [homepage text limits](cms-homepage-text-limits.md)
  on Hero Save and Project/Publication Publish/Update published. Do not add
  other text limits or automatic coercion.
- Contact trims for link validation/resolution, requires a literal `https://`
  prefix (case insensitive), rejects whitespace within the trimmed input and
  URL credentials, and requires an HTTPS protocol and hostname. Hosts are not
  restricted to social platforms. Invalid drafts stay editable; preview links
  remain unavailable. Keep the original input in saved content.
- Projects and Publications currently use `httpsUrl`: acceptance is determined
  by `new URL(value).protocol === "https:"`. This differs from Contact's stricter
  policy, including acceptance of credentials and some URL-parser-normalized
  input. Retain that distinction; do not substitute a stricter built-in URL
  schema or reuse Contact validation without a separately approved rule change.
- Preserve `normalizeSeoPath` semantics: leading slash, no ambiguous separators,
  queries, fragments, whitespace or route patterns; reject invalid escapes,
  decoded dot segments, separators, control characters and pattern segments.
  Retain root, case, trailing-slash normalization, decoding of unreserved percent
  escapes and uppercase remaining escapes. Uniqueness compares normalized paths
  and excludes the edited ID. It is contextual, not a database guarantee.
- SEO blank-field inheritance uses trimmed effective text; stored title and
  description retain their input. Canonicalize paths on successful submission
  only; update the working path only if the user has not entered a newer path.
- Preserve publication date checks: exact `YYYY-MM-DD`, valid UTC calendar-date
  round trip, and no future dates. Supply today's UTC date explicitly to schema
  construction/validation so tests can control it.
- Preserve the existing distinction between a nonblank Project screenshot and
  a truthy Publication cover source. File acceptance is a separate concern.

The owner approved initial homepage text limits as an explicit content-rule
change; the linked map defines their scope and action boundaries. Any other stricter acceptance,
trimming, date or normalization policy must be identified and approved separately.

## Feedback and submission

1. Show actionable field errors first after blur. Once an error is displayed,
   revalidate it as the user corrects it. Untouched fields stay visually valid
   until the relevant action is submitted.
2. Save/Publish validates the complete captured input for that action. Show inline
   errors and focus the first invalid, active, visible field in form order.
   Do not derive focus order from schema issue insertion order or query unrelated
   forms globally. An inactive field must neither block the action nor take focus.
3. Revalidate cross-field errors whenever any dependency changes. This includes
   SEO title/description and contextual path uniqueness, publication date,
   and required image descriptions. Do not require a second submit to clear
   corrected errors. Correcting a displayed error must not expose unrelated
   untouched errors.
4. Save draft remains available despite publication errors. Publish and Update
   published use the same completeness rules. Enter/form submission has explicit
   action intent; implicit submission in collection editors saves a draft.
   A missing submitter must not accidentally publish. Multiline Enter continues
   to insert text.
5. Use a real HeroUI Form and explicit button types/form ownership, including
   toolbar actions outside the field container. Preview, tag controls, discard,
   delete and unpublish controls must not accidentally submit content.
6. Use one explicit source for displayed errors, rendered through TextField's
   invalid state and FieldError. Do not combine competing native, HeroUI and
   manual rule sets. Use ARIA validation behavior so native URL/date/required
   constraints cannot prevent action-specific validation or incomplete saves.
7. Discard restores the saved baseline (empty content for never-saved items) and
   clears validation and submission feedback. Later errors describe current
   values. Preserve pending-state restrictions on discard and lifecycle actions.

## Schema and provider boundaries

Schemas own entity rules and infer domain types where appropriate. Keep raw
input and parsed-output types explicit when a schema transforms values. Parsed
output belongs to the captured submission, never to unrelated newer working
values. Contextual SEO checks accompany schema validation against current records.

Each provider must enforce the same action-specific rules as its editor before
the request/commit boundary. Preserve synchronous duplicate-request locks, the
deep Hero snapshot, separate draft/published snapshots, and lock release on both
success and failure. Validate the captured snapshot and commit that exact
submission. An edit made while a request is pending remains in the working draft
and remains dirty after the earlier submission succeeds. Failed requests preserve
working values and saved/published baselines and permit retry.

Use Zod's built-in `z.flattenError()` for flat schemas and `z.treeifyError()`
for nested errors, as described in the [error formatting documentation](https://zod.dev/error-formatting).
Do not introduce a shared issue or submission-error adapter in advance of a
demonstrated consumer need. Add only local field-name mapping where a form
requires it; preserve nested paths and form-level feedback.

Cross-field issues target actionable active fields. Editors revalidate current
values after corrections and exclude inactive requirements through action
schemas. Associate request errors with submitted values; late responses must
not restore stale errors over corrected input. Provider enforcement reuses
entity schemas and contextual predicates, not editor interaction metadata.
This does not authorize endpoints, backend integration or a second draft store.

ImagePicker retains JPEG/PNG/WebP acceptance, the 10 MiB limit, file reading and
decode checks, cancellation and stale-result protection. Failed replacements keep
the previous image. Integrate its existing errors and focus target without moving
I/O into Zod refinements or triggering reads on ordinary text changes.

## Implementation boundaries

Entity schemas live in `src/cms/{about,hero,social,seo,projects,publications}.ts`.
Homepage budgets come from dependency-free `src/config/content-limits.ts`, shared
by schemas and their limit messages. Future database enforcement must follow the
[limit map migration/counting contract](cms-homepage-text-limits.md#shared-configuration).
Existing `validate*` functions remain local field-message interfaces backed by
those schemas; they are used by editors and previews, not separate rule sets.
Providers parse captured submissions before requests. Publication publish schemas
receive UTC today; `CmsProvider` accepts an optional date supplier for tests.

Each editor owns its blur/submission metadata and derives errors from current
working values and context. Cross-field requirements use the active schema branch.
Project and Publication forms read explicit submitter intent; missing intent saves
a draft. `CmsField` supplies optional blur plumbing, not a shared form engine.

ImagePicker owns file errors, reading/decoding and stale-result cancellation.
Its optional blur/selection callbacks integrate editor feedback; selection includes
failed replacement attempts so Discard can clear feedback without a content edit.
Collection editors reset the picker instance on Discard to abort pending work and
clear local file feedback. A failed replacement keeps the previous valid image;
that retained image remains eligible for publication under the content schema.

## Library integration guidance

HeroUI's [Form API](https://heroui.com/en/docs/react/components/form#api-reference)
supports `onSubmit`, `validationBehavior` and named `validationErrors`.
Its [TextField API](https://heroui.com/en/docs/react/components/text-field#api-reference)
supports controlled values, `validate`, `isInvalid`, Label and FieldError
composition. Use the nondeprecated focus properties if needed (`isFocusWithin`,
not `isFocused`).

[React Aria's forms guide](https://react-aria.adobe.com/forms#validation)
distinguishes default blur/submit validation from controlled realtime errors;
ARIA mode avoids submission blocking. Form `validationErrors` appear immediately
and clear when fields change, which alone does not implement correction validation
or cross-field dependencies. For this contract, use controlled schema-derived
errors with small blur/submission metadata, and prove the interaction in About
before copying it. Do not assume wrapping fields in Form supplies the full policy.

[Zod basics](https://zod.dev/basics) documents `safeParse`, issue paths, `z.infer`,
`z.input` and `z.output`. Use [refinements](https://zod.dev/api#refinements) to retain
the existing predicates and attach cross-field issues, rather than changing
acceptance via generic format validators. [Zod requirements](https://zod.dev/#requirements)
require TypeScript 5.5+ with strict mode. Verify the selected direct dependency
and installed declarations when adding it; documentation may describe newer APIs.

## Verification contract

Migration behavior is risk level 2: focused tests must cover visible errors,
correction, focus, action results and retained values, including pending-edit
races, failure/retry, cross-field dependencies and snapshot isolation. Test
observable outcomes rather than schema call counts or component internals.

Run focused tests, types, repository lint and whitespace checks per slice; run
the full regression suite at final acceptance. Controller-owned checks remain
build, browser keyboard/Enter/blur/focus and screen-reader associations, desktop,
320px, 200% zoom, themes, conditional fields and public-page regressions.
Performance is possible: text typing/blur in a long article and repeated preview
visits must remain responsive, without validation-induced request traffic or
image reading/decoding. Owner review of the About interaction precedes reuse;
singleton/SEO review precedes collection forms. Final acceptance requires the
owner's review and reported controller checks.

Progress, baseline results, implementation inventories and raw evidence belong
in the ignored `local-workspace/cms-validation-tracker.md`, not this contract.
