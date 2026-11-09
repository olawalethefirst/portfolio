# CMS local drafts

CMS working drafts automatically survive navigation and reloads on the same
browser. Explicit Save and Publish actions retain their existing meanings.

## Shared integration

`src/cms/working-drafts.ts` owns restoration, memory state, debounced writes,
removal, and persistence status. Each provider configures `useDraftStore` with a
stable namespace and a Zod shape schema. Schemas must accept unfinished input;
required fields, URL checks, and content limits belong to explicit save/publish
validation, not local restoration.

Editors use `useWorkingDraft` for `value`, `setValue`, `reset`, `ready`, and
`persistenceStatus`. Render the loading status until `ready`; show
`CmsDraftFeedback` beside existing explicit save feedback. Use `reset(saved)`
for Discard to persist the baseline immediately. Clear a record's draft only
after successful deletion. Normal edits need no persistence calls.

## Storage contract

One localStorage entry per logical record:

`portfolio:cms-drafts:v1:<namespace>:<encoded-record-key>`

The JSON value is `{ id, value }`. Namespaces separate Hero, About, Contact
(social), Projects, Publications, and SEO. A new-record draft uses `new` and
retains its generated ID; the ID alias exists only in memory, avoiding duplicate
stored content. Starting a fresh new record retains existing clearing behavior.
No account identity exists in this implementation; account scoping must precede
use with multiple authenticated accounts on the same browser.

Restoration runs after client mounting, before editor interaction or any write.
Only edited/reset drafts are written. Updates persist after a 300 ms pause;
editor/provider unmount, pagehide, and a hidden document flush pending writes.
Discard immediately writes the provider baseline. Deletion removes the draft
and supersedes queued edits. Explicit save completion does not clear the working
draft, so newer edits remain intact.

Malformed entries fall back to provider values with recovery feedback. Read/write
failures do not block editing. Failed writes/removals remain queued for the next
edit or lifecycle flush. A forced browser/process termination can lose edits
inside the debounce window. Concurrent tabs are independent; simultaneous writes
to the same draft are not coordinated.

## Scope and limitations

Only working drafts are durable. Current provider saved values and record
collections remain in memory and reinitialize on reload. Discard uses the
provider's current saved values, which after reload are application initial
values. This feature does not make newly created saved records available at
their record routes after a reload; collection/API persistence is separate.

Remote comparison, conflict resolution, server revisions, account integration,
and cross-tab synchronization are deferred. Future API work can add a server
baseline and revision checks without changing form input handlers.

## Deferred reconciliation contract

Revisit this contract when the CMS API loads and explicitly saves real records.
This is a documented integration requirement, not an implemented feature or an
external issue-tracker ticket.

- Retain the original server snapshot alongside local edits. Compare original,
  local, and newly loaded remote values; timestamps alone do not detect conflicts.
- Keep remote-only changes automatically. Keep local-only changes automatically.
  Equal local/remote values need no review. Ask only when both changed the same
  logical form field differently from the original snapshot.
- Reuse one review message and conflict modal across forms. Show a table with
  readable field labels, full formatted/stringified local and remote field
  values, and a choice for each conflict. Do not require object-path drill-down.
- Apply selections to the local working draft only. Dismissal preserves edits;
  writing remote content still requires the existing explicit Save action.
- Define recovery for legacy v1 drafts, which lack an original server snapshot.
  Do not infer which fields changed locally from a two-way comparison alone.
- Add account-scoped storage keys when authenticated account identity is available.
- Consider revision-checked server saves during API design as a separate server
  concern. They are not part of this local persistence change.

Acceptance at API integration: a remote-only edit never prompts, independent
edits survive together, overlapping differing edits can be selected per field,
and resolving or dismissing the modal never writes remote content automatically.

## Verification

Behavior is Level 2 under CONSTRAINTS.md: focused tests cover reload recovery,
isolation, new-record identity, debounce/lifecycle flush, reset/removal, and
storage failures. CMS integration tests cover every editor, alongside existing
save/publish tests that protect edits made during requests. TypeScript and
repository lint must pass. Production build and browser/accessibility review
remain controller-run. Performance classification is possible: verify typing
responds within 100 ms with a representative 50,000-character publication; storage writes must
occur after the debounce or lifecycle flush, not on every keystroke.
