# Project reads

`GET /api/admin/projects` returns the complete ordered `ProjectRecord[]` directly,
including every saved draft and its nullable published snapshot. Ordering is
position then ID; collection order is the ordering contract. Snapshot fields
support the existing list and section preview without a separate preview route.
An empty collection returns `[]`. Search and filtering remain client concerns.

`GET /api/admin/projects/:id` accepts a UUID and returns one `ProjectRecord`
directly. Malformed IDs receive 400/INVALID_REQUEST, absent records receive
404/NOT_FOUND, and unexpected failures receive safe 500/INTERNAL_ERROR feedback.

Both reads require the configured owner through `withAdminApi`: anonymous users
receive 401, other users 403. Missing owner configuration fails closed. These
responses include saved drafts and are outside the public Hero/About/Social/SEO
read policy. All outcomes use `Cache-Control: private, no-store`; session response
headers and cookies use the existing shared wrapper.

Queries map the existing authoritative SQL tables and left join published
snapshots. Saved edits do not substitute for live content. Registered screenshot
references use `/media/:assetId`; absent references become empty strings. Serving
that URL and registering uploaded assets are separate Media capabilities.
No separate read service is required by the current operation.

## Public read

`listPublishedProjects()` inner-joins `published_projects` to `projects`, so an
unpublished or deleted Project is simply absent — there is no separate denial
path to get wrong. Ordering matches the admin collection: position then ID.
Each entry is `{ id, ...PublishedProject }`, the published snapshot's content
fields plus the Project's persistent ID; there is no draft/published envelope,
since a public reader has no use for draft content.

This has no HTTP route. Like `readHero`/`readAbout`, the public homepage calls
it directly from a Server Component; `/api/admin/projects` remains owner-only
and continues to expose drafts, so it cannot serve this purpose even with a
public wrapper.

## Project deletion

`DELETE /api/admin/projects/:id` requires a same-origin request and the configured
owner. It accepts no body and requires no Content-Type header. Invalid UUIDs
receive 400/INVALID_REQUEST; an absent Project receives 404/NOT_FOUND. Success
returns 204 with no body. Unexpected failures use safe 500/INTERNAL_ERROR feedback.
The shared owner wrapper preserves session writes and private/no-store responses;
the origin guard rejects missing, opaque or mismatched origins before auth or DB
access.

One parameterized DELETE removes the saved Project. The authoritative SQL foreign
key cascades removal to its published snapshot. Media records and physical objects
remain. There is no separate deletion service: cascade persistence belongs to the
DB layer, while validation, authorization and status mapping belong to the route.
CMS deletion UI integration remains a separate capability.

## Ordering persistence boundary

The DB ordering operation accepts the complete sequence of saved Project IDs,
including unpublished drafts. IDs must identify every current Project exactly
once. UUID case does not change identity. Duplicate, unknown or missing IDs return
a membership conflict without writes; an empty order succeeds only for an empty
collection. The caller validates UUID structure before invoking persistence.

Membership verification and the position-only update share a read-committed
transaction. A SHARE ROW EXCLUSIVE table lock serializes reorders and blocks
Project inserts/updates/deletes until transaction end, including inserts into an
empty collection; ordinary reads remain available. Row locks alone would not
protect against new Projects appearing during membership verification. Keep the
transaction short and do not add external work inside it. Existing draft,
published-snapshot and media content is preserved. Repeating an order with
unchanged membership yields the same zero-based positions. A later create retains
the existing database default position; append-on-create is not implied.

The configured database role must support this lock as well as Project reads and
updates. Unexpected database failures propagate and roll back the transaction;
test-driver results alone do not prove live permissions, locking or rollback.

## Ordering endpoint

Owner-only `PUT /api/admin/projects/order` carries `{ ids: [...] }`. Order is
collection state and the body is its complete replacement, so PUT matches the
URL it writes and repeating a request changes nothing; a collection PUT would
instead claim to replace the projects themselves. The route owns the fixed
schema: a strict object whose `ids` is an array of UUIDs. Structural
failures and malformed JSON are 400/INVALID_REQUEST before any persistence. The
route adds no membership checking of its own; exactness must stay inside the
locked transaction to remain atomic, so a persistence conflict maps to
409/CONFLICT. Success returns 200 and the canonical ordered collection in the
same shape as the collection GET, letting the client adopt server order without
a second request. Same-origin and JSON content-type guards precede authorization,
and `withAdminApi` applies `private, no-store` to every outcome. The static
`order` segment resolves before `[id]`, and the detail route rejects non-UUID
IDs, so the two paths cannot collide.

There is no ordering service. A fixed request schema belongs at the route, and
membership is already enforced by persistence, so a service would only forward a
parsed array and wrap one result.

## Client server-state

`src/cms/project-api.ts` owns transport only: the collection read and the order
write, each validating responses against `projectRecordSchema`.
`src/cms/project-queries.ts` owns cache behavior under the per-account key
`["cms", accountId, "projects"]`. A reorder applies the submitted order to the
cache immediately, then replaces it with the response, so the server stays
authoritative over anything the client guessed. Any failure restores the prior
order. A membership conflict or a lost response additionally refetches, because
in both cases the client cannot know current truth; an ordinary server error
does not, since the write provably did not land. The submitted IDs must match
the cached collection exactly or the optimistic step is skipped, leaving the
server to answer.

The hook holds no in-flight lock of its own. It reports `pending`, and callers
disable their ordering controls while it is true, which is the control the list
already applies.

## List screen

`ProjectList` reads the collection through the query and owns the whole-list
view: loading, a read failure with retry, search, status filter and the section
preview. Moving a row submits the complete ID order, never a single move, so
the request always states the full intended order. Ordering controls are
disabled while a reorder is pending and while a filter hides rows, because a
position shown inside a filtered view would not match the collection. A failed
reorder clears the move announcement and reports the server's message in an
alert; a membership conflict then refetches, so the list snaps to server truth.

`ProjectProvider` no longer carries `move`. It still holds `records`, `commit`
and the working-draft store for the editor.

## Editor existence check

`ProjectEditor`'s outer "does this Project exist" check reads
`useProjectsQuery` directly, so any Project the server returns opens, including
one absent from `ProjectProvider`'s local demo content. `id === "new"` skips
the query entirely, since a new draft needs no existing record. A collection
read failure shows a retry; a missing ID shows "Project unavailable".

`ProjectEditorForm`'s own record lookup and `commit` are unchanged and still
read `ProjectProvider`'s demo array, because `commit` does not yet write to the
query cache; that lands with real persistence in 08.08. Until then, a Project
that exists on the server but not in the two-item demo fixture opens, but
renders as a blank new draft rather than its real saved content — the editor
cannot show content it has no connected source for. Save, publish, unpublish
and delete keep operating on the demo array for every Project until the editor
is wired to the write module below.

## Write server-state module

`project-api.ts` adds `create`, `save`, `publish`, `unpublish` and `remove`,
each a thin call to its existing endpoint. `project-queries.ts` adds
`useProjectMutations()`, exposing a single `commit(id, draft, action)` that
matches `ProjectEditorForm`'s existing call shape, so wiring it in only swaps
the implementation the component calls, not the call itself.

`commit` dispatches by `id`/`action` to the right endpoint, then patches the
cached collection array to match what each endpoint actually proves:

- a `new` ID always creates, appending the response at the end of the cached
  array. Its DB-default position is not authoritative; the existing reorder
  control places it correctly, so no refetch is forced.
- **Save never touches the cached `published` field.** `PUT /:id` reports
  `published: null` unconditionally — it does not own that field, only the
  `/published` endpoints and first-publish create do — so applying its
  response verbatim would make a published Project look unpublished after
  every draft Save. The merge keeps whatever `published` the cache already
  had and takes everything else from the response.
- publish replaces the record outright; the response is authoritative for
  both draft and the new published snapshot.
- unpublish clears only the cached `published` field, from the response's
  returned draft id, not a full record.
- delete removes the entry.

A failure that leaves the client unsure of truth — a lost response, or a
membership-style conflict — refetches, the same rule `useReorderProjects`
uses. An ordinary rejected write (validation, not found) does not; the
component already surfaces that through the thrown error.

## Editor write wiring

`ProjectEditorForm` calls `useProjectMutations().commit(recordId, value, action)`
directly, where `recordId` is `initialRecord?.id ?? "new"` — the persisted ID,
never the working-draft's own local identity (a client-generated UUID used only
for localStorage matching). The two must stay distinct: the local draft needs
an identity before any Project exists server-side, but every write to the
server must key off the real persisted ID, or a "new" draft's own random ID
could be mistaken for one.

The dirty-check and Save/Publish/Unpublish/Delete availability all read
`useProjectsQuery().data`, the same cache `commit` patches, so they reflect a
just-saved value immediately, including a Save that must not disturb the
cached `published` field (see above).

A successful `new`-draft Save or Publish always creates, so its result is
always a `ProjectRecord`. The editor clears the local `"new"` draft and
redirects to `/admin/projects/:id` with the created ID. Without the redirect, a
second Save would call `create` again — the component has no other way to
learn that this draft now has a server identity — so this is required, not
cosmetic.

`ProjectProvider` keeps only the shared local-draft store (`working`), since
the list's "New project" action and the editor's draft recovery must agree on
one store instance; it holds no server state. `commit`'s own synchronous
in-flight flag is intentionally local to the form (`saving` state set before
calling `commit`, not `useProjectMutations().pending`): `useMutation` does not
guarantee its `isPending` flips within the same tick as the call that starts
it, and the fieldset's disable-on-submit contract needs that guarantee.

## Draft write validation

Project POST with Save intent and item PUT validate the request structure once
and persist directly through insertProject/updateProject. Incomplete drafts remain
allowed; Save has no forwarding service or duplicate structural parse. POST Publish
intent and published PUT still invoke the publishing service for completeness
rules and atomic persistence. Existing response shapes/statuses are unchanged.
