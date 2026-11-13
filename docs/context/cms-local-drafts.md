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
The studio supplies account identity for server query isolation. Local draft keys
remain unscoped; account-scoped storage and migration are deferred.

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

Hero now fetches and saves real server content, as documented in
[Hero API integration](hero-api.md#hero-editor-integration). Its existing local
draft format and recovery behavior remain unchanged. Shared reconciliation,
account-scoped drafts and migration are deferred to the next iteration per owner
direction. The remaining editors still use in-memory saved values.

For editors other than Hero, only working drafts are durable. Provider saved values and record
collections remain in memory and reinitialize on reload. Discard uses the
provider's current saved values, which after reload are application initial
values. This feature does not make newly created saved records available at
their record routes after a reload; collection/API persistence is separate.

Remote comparison, conflict resolution, server revisions, account-scoped local
storage and cross-tab synchronization are deferred. Hero already uses a server
baseline; original-snapshot metadata and reconciliation remain future work.

## Deferred reconciliation contract

Hero now loads and saves real records; this reconciliation contract remains
explicitly deferred to the shared follow-up.
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
- Use the available account identity for account-scoped storage keys, with migration.
- Consider revision-checked server saves during API design as a separate server
  concern. They are not part of this local persistence change.

Acceptance for the deferred reconciliation implementation: a remote-only edit never prompts, independent
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
