# CMS draft reconciliation specification

## Objective and scope

Let the CMS owner review local draft values inside the existing editing form,
choose values field by field, and explicitly save the resulting content. Hero is
the first consumer; shared behavior must be reusable by other server-backed
editors without introducing a separate representation of their fields.

This specification supersedes the previous three-way reconciliation proposal.
Only current server content and local draft content are compared. No original
server snapshot, edit history, timestamp-based conflict detection, or inference
about who edited a value is required. The assembled form is editable working
state, not a third historical comparison source.

Hero implements this contract through the shared draft store and field controls.
Other editors retain their existing recovery behavior until they adopt it.
Integration details are described in [CMS local drafts](cms-local-drafts.md).

## Form behavior

1. Wait for server content and local restoration before offering review. A failed
   server read must not substitute sample data or erase the stored draft.
2. Initially display current server values in the existing form controls, even
   when a local draft exists. Merely displaying these values must not persist
   them over the recovered draft.
3. If any local draft fields differ from the server, show one inline notice above
   the form: “You have local changes. Review them beside each field.”
4. Beside each differing field's existing label, show a compact text button,
   initially “Use draft”. Clicking it places that field's draft value into the
   existing control; the action becomes “Use saved”. Clicking “Use saved” restores
   that field's current server value and offers “Use draft” again.
5. Fields remain editable. The user may combine saved values, draft values, and
   newly typed values in the same form. Selecting a value affects only that field.
6. Equal fields have no review action. The presence of an unselected draft alone
   does not make the form dirty or enable Save.
7. Existing Preview renders the assembled form values. Existing validation and
   explicit Save semantics remain in force.

Use the actual existing controls for text, Markdown, images, and other field
kinds. There is no separate comparison table, conflict modal, read-only form
mode, full-width per-field toggle, or alternate value renderer.

## Save and draft lifecycle

- Enable Save when the assembled form differs from current saved server content,
  subject to existing loading/pending guards. Existing validation governs whether
  a submission may proceed.
- Save submits the assembled form, including any draft values the user selected.
  Unselected draft alternatives are not implicitly included.
- Only confirmed successful Save clears the item's local draft and recovered
  alternatives. Adopt the canonical server response as the form's saved baseline.
- Clearing must cancel or supersede queued draft writes so debounce, unmount, or
  pagehide cannot resurrect pre-save content.
- Failed validation, rejected saves, and unconfirmed network outcomes retain the
  draft. A save attempt alone is not evidence of success.
- Subsequent edits create a new draft. Hero already disables edits/actions while
  Save is pending; preserve that behavior. Before another editor adopts this
  lifecycle, ensure a successful older request cannot erase later edits.
- Switching between saved and draft values does not clear the recovered draft.
  Preserve its alternatives while the user reviews and edits other fields.
- Discard restores current server values and clears stored recovery alternatives.
  It is available when either the form is dirty or differing draft values remain.
- Background server refreshes must not silently replace active form edits or
  recovered alternatives. “Use saved” refers to the latest available server value.

## Shared elements and ownership

| Element | Responsibility |
|---|---|
| Existing server query and mutation | Fetch current server content, submit explicit saves, expose canonical results and failures. |
| Shared draft store | Restore/persist unfinished local edits; preserve recovery alternatives during review; clear successful saves without queued-write resurrection. |
| Shared review state | Coordinate available draft values, form values, field choices, and dirty state. Compare only current server and draft values. |
| Existing field label composition | Own the reusable draft/saved button using a shared value binding, retaining each field's native editor. Parents supply field readers/writers rather than button markup. |
| Inline notice | Explain why field-level draft actions are available. |
| Editor integration | Bind real fields and existing Preview, validation, Save, and Discard to shared behavior. |

Use the current React/TypeScript, Zod, TanStack Query, and HeroUI stack. Keep shared
state in `src/cms/` and reusable controls in `src/components/cms/`. Existing
`working-drafts.ts`, `HeroEditor.tsx`, and field wrappers are the integration
points; exact file boundaries belong to implementation planning. Avoid a generic
field renderer or path-navigation framework. Follow existing named exports and
typed hook conventions, for example `const dirty = !sameHero(value, saved)`.

## Accessibility and icon decisions

Keep native field labels and their input associations. Place review actions next
to labels, not inside the interactive label itself. Use type="button" so choosing
a value never submits the form. Accessible names identify the action and field,
for example “Use draft headline” and “Use saved headline”; repeated stage fields
include stage context.

Use existing ghost/text button styling, without icons, following the
[field and button icon policy](field-and-button-icon-policy.md). Existing input
icons remain unchanged; textareas remain icon-free. Keep the existing Save icon.
Actions must work by keyboard, retain usable focus when toggled, and wrap without
overlapping labels on narrow screens. The notice must be readable without color
or icon interpretation.

## Boundaries

Always preserve unfinished input and existing validation, storage-failure
feedback, debounce, and lifecycle-flush guarantees. Keep local changes separate
from explicit remote persistence. Do not weaken CONSTRAINTS.md.

No new API endpoints, database changes, dependencies, server revision checks,
three-way merge engine, historical snapshots, legacy-snapshot recovery flow,
cross-tab synchronization, or global authentication changes are included.
New-record creation and server integration for other entities are separate work.
Account-scoped storage remains an existing follow-up requirement; its rollout and
handling of current unscoped keys must be settled before storage format changes.

## Acceptance and verification

Behavior is Level 2 under CONSTRAINTS.md. Add focused tests for observable outcomes:

- A differing stored draft leaves initial controls on server values, displays the
  notice and appropriate field actions, and survives initial render untouched.
- An equal or absent draft adds no review actions and leaves Save disabled.
- “Use draft” and “Use saved” update only their field; independent selections and
  direct edits combine correctly, including nested Hero stage fields.
- Save becomes enabled exactly when form values differ from current server
  content, respecting pending guards; returning all values to saved values makes
  the form clean again.
- Preview and Save use assembled form values, not unselected alternatives.
- Successful Save adopts canonical content, clears persisted recovery state, and
  prevents stale queued writes from restoring it; a later edit creates a new draft.
- Validation failures and failed/unconfirmed saves preserve recoverable work.
- Reviewing one field does not destroy another field's unreviewed draft value.
- Refreshes do not erase active edits. Storage failures remain visible and do not
  prevent editing or falsely report successful local cleanup.

Use Vitest tests beside the shared logic and Hero editor. Run the affected tests,
then TypeScript and repository lint:

```sh
pnpm exec vitest run src/cms/working-drafts.test.tsx src/components/cms/HeroEditor.test.tsx src/components/cms/HeroEditor.remote.test.tsx
pnpm exec tsc --noEmit
git ls-files --cached --others --exclude-standard -z -- '*.js' '*.jsx' '*.mjs' '*.ts' '*.tsx' | xargs -0 pnpm exec eslint --
git diff --check
```

Include any new reconciliation test files in the focused command when created.
No coverage percentage is introduced. The controller runs `pnpm build` and
browser/keyboard checks unless explicitly delegated. Check restore, field
selection, manual typing, Preview, successful/failed Save, reload after Save,
narrow layouts, both themes, and focus behavior.

Performance is possible: preserve debounced storage writes; do not write on every
keystroke. When adopted by publication editing, verify typing responds within
100 ms with a representative 50,000-character article, per the existing draft
contract. Runtime verification applies to the implementing changes, with build and browser
checks remaining controller-owned.

## Interaction and persistence decisions

- Typing replaces that field's draft candidate with the newly entered value.
  Its action becomes Use saved when the typed value differs from saved content.
  Selecting saved content makes Use draft available again. Labels name actions,
  not a claim about who last edited the content.
- Selecting a source changes only the assembled form; it does not overwrite
  the stored candidate. Reload restarts on current server content and offers
  the latest draft candidates again. Selection progress is not persisted.
- Field edits update only that field in the stored draft, preserving unreviewed
  alternatives in other fields. No original server snapshot is stored.
- Discard explicitly clears all draft alternatives and resets the form.
- Preserve the v1 storage representation in this iteration. Account-scoped key
  rollout and migration remain a separate follow-up; this change does not claim
  account isolation for browser drafts.
- If Save completes after navigation, remove the submitted editor's stored draft
  only if it has not been replaced by later work. Active editing remains disabled
  during Save. A failed local removal is not proof that storage was cleared.
