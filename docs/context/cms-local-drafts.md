# CMS local drafts

CMS working drafts automatically survive navigation and reloads on the same
browser. Explicit Save and Publish actions retain their existing meanings.

Hero, About and Contact use the server-first review behavior in
[draft reconciliation](cms-draft-reconciliation-spec.md). Other editors retain
the original working-draft behavior described below until their API integration.

## Shared integration

`src/cms/working-drafts.ts` owns restoration, memory state, debounced writes,
removal, and persistence status. Each provider configures `useDraftStore` with a
stable namespace and a Zod shape schema. Schemas must accept unfinished input;
required fields, URL checks, and content limits belong to explicit save/publish
validation, not local restoration.

Editors use `useWorkingDraft` for `value`, `setValue`, `reset`, `ready`, and
`persistenceStatus`. Render the loading status until `ready`; show
`CmsDraftFeedback` beside existing explicit save feedback. Use `reset(saved)`
for Discard to persist the baseline immediately. For these original consumers, clear a record's draft after successful deletion.
Hero, About and Contact also clear drafts on successful Save and Discard, as described below. Normal edits need no persistence calls.

## Storage contract

One localStorage entry per logical record:

`portfolio:cms-drafts:v1:<namespace>:<encoded-record-key>`

The JSON value is `{ id, value }`. Namespaces separate Hero, About, Contact
(social), Projects, Publications, and SEO. A new-record draft uses `new` and
retains its generated ID; the ID alias exists only in memory, avoiding duplicate
stored content. Opening New resumes an unfinished draft; Discard changes starts blank.
The studio supplies account identity for server query isolation. Local draft keys
remain unscoped; account-scoped storage and migration are deferred.

Restoration runs after client mounting, before editor interaction or any write.
Only edited/reset drafts are written. Updates persist after a 300 ms pause;
editor/provider unmount, pagehide, and a hidden document flush pending writes.
For original consumers, Discard immediately writes the provider baseline. Deletion removes the draft
and supersedes queued edits. Original consumers do not clear the working draft on explicit save completion.
Hero, About and Contact clear it after a confirmed successful save, superseding queued writes.
SEO also clears the completed New draft after confirmed creation, before UUID
navigation, superseding queued writes and removing its in-memory alias. Unfinished
New work and failed or unconfirmed creation retain their drafts. A late creation
response after unmount does not clear drafts or navigate a newer session.

Malformed entries fall back to provider values with recovery feedback. Read/write
failures do not block editing. Failed writes/removals remain queued for the next
edit or lifecycle flush. A forced browser/process termination can lose edits
inside the debounce window. Concurrent tabs are independent; simultaneous writes
to the same draft are not coordinated.

## Scope and limitations

Hero, About and Contact fetch and save real server content, as documented in
[Hero API integration](hero-api.md#hero-editor-integration),
[About editor integration](about-api.md#editor-integration) and
[Contact editor integration](social-api.md#editor-integration). Each uses
`useReconciledDraft` with the existing v1 store: current server content initializes
the form; local draft values remain available through label-side field actions.
No historical snapshot or extra storage format is required. Account-scoped keys
and their migration remain deferred.

For editors other than Hero, About and Contact, only working drafts are durable. Provider saved values and record
collections remain in memory and reinitialize on reload. Discard uses the
provider's current saved values, which after reload are application initial
values. This feature does not make newly created saved records available at
their record routes after a reload; collection/API persistence is separate.

## Server-backed reconciliation

The [CMS draft reconciliation specification](cms-draft-reconciliation-spec.md)
supersedes the previous original/local/remote comparison and conflict-modal
proposal. Compare current server content with the local draft only. Default the
existing form to server values, offer label-side Use draft / Use saved actions,
and save the assembled form explicitly. A successful save clears the local draft;
subsequent edits start a new draft. Failed saves preserve it.

Hero, About and Contact implement this behavior. `useReconciledDraft` separates assembled form
values from the stored candidate. Its `edit` callback must be a pure, field-local
update: the same update applies to the displayed form and the stored draft, so
unreviewed values in other fields survive. `choose` updates only the form. On
reload the form starts from server values again; source choices are not persisted.
Mount a new editor session when the record/account changes.

The hook's `bindField(read, write)` returns current `value`, `savedValue`,
optional differing `draftValue`, `isDisabled`, and `onChange`. Configure
`useReconciledDraft` once with `{ disabled: pending, onChange: resetSave }`.
Bindings guard changes while disabled and notify the editor before applying
accepted changes. Editors spread bindings directly onto `CmsField` and supply
stage-specific accessible context; no editor-local binding wrapper is needed.
`CmsField` owns the shared button and derives Use saved when its current value
equals the draft value, otherwise Use draft. No separate toggle state is needed.
The callback's optional source distinguishes selecting an alternative from typing:
selection changes only the assembled form, while typing updates the candidate.
A missing draft value removes the button, including after successful Save.
Field bindings explicitly accept strings. Supporting object, array, or image
values requires an intentional extension of the binding and equality contract.

`reset()` clears draft storage and releases the local form override after
successful Save or Discard. The form then reads directly from current server
query state; the Save mutation updates that state with its canonical response.
Later server refreshes therefore appear without retaining an old saved copy. Discard remains available for differing
recovery values even when the form is clean. Store removal replaces queued writes,
preventing stale drafts from returning on debounce or lifecycle flush. Cleanup
errors use existing local-persistence feedback and retry on later flushes.
When a save finishes after navigation, the editor uses guarded clearing: remove
only a matching in-memory and persisted draft, preserving later work.

Historical server snapshots and legacy-snapshot recovery are not required. Server
revision checks and cross-tab synchronization remain outside this scope.

## Verification

Behavior is Level 2 under CONSTRAINTS.md: focused tests cover reload recovery,
isolation, new-record identity, debounce/lifecycle flush, reset/removal, and
storage failures. CMS integration tests cover every editor, alongside existing
save/publish tests that protect edits made during requests. TypeScript and
repository lint must pass. Production build and browser/accessibility review
remain controller-run. Performance classification is possible: verify typing
responds within 100 ms with a representative 50,000-character publication; storage writes must
occur after the debounce or lifecycle flush, not on every keystroke.
