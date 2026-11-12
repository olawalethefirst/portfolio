# Shared JSON API request and response conventions

These conventions define the JSON content API boundary. They do not imply runtime implementation.

## Boundary and scope

Keep the agreed 17 route patterns / 31 operations. This proposal covers JSON
content operations and a typed fetch boundary, not OAuth redirect responses,
media redirects or Supabase SDK errors. No new routes, pagination, database
columns, revision tokens, retry receipts or numeric limits are introduced.

## Requests

Send application/json for operations with JSON bodies. PUT replaces the complete
editable content for its target; it never creates a missing record. Server-owned
IDs and published state are not editable payload fields. Route IDs identify
existing records; POST creation does not accept a persistent client ID. Reject
unexpected fields rather than forwarding them to database writes.

| Consumer/action | Body |
|---|---|
| Hero PUT | Complete HeroDraft: eyebrow, headline, stages containing idea/iterate/solution tagline and description |
| About PUT | heading, biography |
| Social PUT | github, linkedin, x |
| SEO POST / PUT | path, title, description; ID comes from route or creation response |
| Project / publication POST | { intent: "save" or "publish", draft: complete editable draft } |
| Project / publication item PUT | { draft: complete editable draft }; Save only |
| Project / publication published PUT | { draft: complete editable draft }; validate, save and publish current submitted edits atomically |
| DELETE item / published | No body |

Project editable fields follow src/cms/projects.ts: name, summary, what, how,
platform, screenshot, screenshotAlt, liveUrl. Publication fields follow
src/cms/publications.ts: title, summary, bodyMarkdown, coverSrc, coverAlt,
tagsText, publishedOn. No kind or externalUrl. Keep date-only publishedOn as
YYYY-MM-DD, not a JavaScript Date or timezone timestamp.

These field sets do not finalize new-upload descriptor representation. Media
association inputs, upload permission inputs and ordering inputs require their
own consumer-specific design before implementation. Do not treat a screenshot
or coverSrc string as proof of upload ownership/existence.

Keep complete editable strings, including blanks for incomplete draft Save.
Server validation applies action-specific structural/date/reference rules;
Publish applies completeness rules. Reuse existing approved text limits; no new
limits are selected. SEO normalization and default protection remain mandatory.

## Successful responses

Use direct JSON resource bodies without a second success flag or data wrapper.
GET item and PUT return 200 plus the canonical saved resource. POST returns 201
plus the created resource and server ID. DELETE returns 204 with no JSON body.
Collection GET returns a complete JSON array; resource-specific list projections
must include their agreed ordering/section-preview needs and be specified in
that entity slice. No invented pagination metadata.

Singleton resources return their editable content shape. SEO returns
{ id, path, title, description }, including the / default in collection reads.
Project/publication detail and save/publish responses return
{ id, draft, published }, where published is a nullable snapshot. Unpublish 204
causes the client to invalidate/refetch server state while retaining local drafts.
Physical media deletion is not implied by any response.

## Error responses

Error shape and server/client ownership are defined in
[the JSON API error contract](api-errors.md). The server returns
`error: { code, message, issues?: [{ pointer, message }] }`. Pointers identify
locations in the actual request body using JSON Pointer. UI keys and focus
behavior are owned by resource form adapters, not server responses or the shared
fetch client. This supersedes the earlier fieldErrors wire proposal.

| HTTP | Code | Meaning / UI handling |
|---|---|---|
| 400 | INVALID_REQUEST | Malformed JSON or invalid request structure; form-level feedback |
| 401 | UNAUTHENTICATED | No valid login; retain local edits and initiate accepted login handling |
| 403 | FORBIDDEN | Signed in but not configured owner; no mutation |
| 404 | NOT_FOUND | Resource absent; do not silently create it |
| 409 | CONFLICT | Known resource conflict, e.g. normalized SEO path collision; include path feedback when applicable |
| 422 | VALIDATION_ERROR | Well-shaped content fails Save/Publish rules; display field feedback |
| 500 | INTERNAL_ERROR | Unexpected server failure; safe form-level feedback |
| 503 | SERVICE_UNAVAILABLE | Known temporary dependency unavailability; retain edits |

Missing ADMIN_USER_ID is server misconfiguration, never permission to admit an
otherwise authenticated user. Return a safe server failure; authorization must
fail closed. Database permission errors are server failures, not evidence that
the logged-in owner lacks application authorization.

No concurrency protocol is selected by the 409 convention. Unknown request
fields/types are 400; invalid values in correctly typed fields are 422. A missing
required content string is structural 400; a present blank required string is
422 for actions that require it. Form-level feedback covers unmappable errors.

## Existing editor feedback mapping

| Resource | Client adapter output keys / focus behavior |
|---|---|
| Hero | eyebrow, headline, idea-tagline, idea-description, iterate-tagline, iterate-description, solution-tagline, solution-description; map nested stages paths to these existing keys |
| About | heading, biography |
| Social | github, linkedin, x |
| SEO | path, title, description |
| Project | name, summary, what, how, platform, screenshot, screenshotAlt, liveUrl |
| Publication | title, summary, bodyMarkdown, coverSrc, coverAlt, tagsText, publishedOn; bodyMarkdown targets the existing Article action |

Keep existing editor-defined visual focus order, not JSON property order. Reveal
server field feedback after the failed action. Only apply feedback to the
submitted editor version; a late failure must not mark newer input invalid or
steal focus after subsequent editing/navigation. Always retain the working draft.

## Fetch and draft ownership

The shared fetch client preserves structured request-pointer issues without UI mapping.
Resource form adapters map those pointers to the keys above. Typed fetch adapters
encode requests, check HTTP status, handle 204 before JSON
parsing, validate expected response shapes, and raise a structured error for
TanStack Query. They do not navigate, focus controls or mutate local drafts.
TanStack Query owns remote records and mutation state; the editor owns working
input, baseline reconciliation, field feedback and focus.

Capture submitted input and the editor generation. A success updates remote
state/baseline with canonical saved data without replacing edits typed during
the request. Account changes must isolate query state and local drafts; exact
account/recovery integration is separate work. No speculative resource hooks.

Do not automatically retry mutations, especially creates: a network failure can
leave the outcome unknown. Preserve edits, invalidate/refetch as appropriate,
and never claim a failed response proves rollback. Explicit create-retry recovery
and concurrent-write handling still need design before affected consumers ship.
Do not infer idempotency support from PUT/DELETE names alone.

## Review examples

1. Hero with a blank stages.idea.tagline: 422, issue pointer /stages/idea/tagline; the form maps it to idea-tagline to
   highlight/focus the existing Tagline field without exposing nested SQL paths.
2. Incomplete publication Save: accept structurally valid unfinished article;
   Publish with empty body: 422, issue pointer /draft/bodyMarkdown; the form maps it to Article.
3. Duplicate normalized SEO path: 409 with path feedback; preserve input.
4. New typing during Save: response advances saved baseline but retains new text;
   stale validation feedback does not focus or invalidate that new text.
5. DELETE 204: no JSON parse attempt; refresh remote state, retain drafts on
   unpublish, and follow the separately accepted deletion UI contract.
6. POST response lost: retain local work and report uncertain outcome; no blind
   automatic creation retry or invented receipt protocol.

Ordering/upload payloads, concurrent-write handling and creation-retry recovery
require separate design before affected consumers are implemented.
