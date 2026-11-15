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

## Draft write validation

Project POST with Save intent and item PUT validate the request structure once
and persist directly through insertProject/updateProject. Incomplete drafts remain
allowed; Save has no forwarding service or duplicate structural parse. POST Publish
intent and published PUT still invoke the publishing service for completeness
rules and atomic persistence. Existing response shapes/statuses are unchanged.
