# SEO API

`GET /api/admin/seo` returns the complete JSON array of saved
`{ id, path, title, description }` resources, including the `/` default.
`GET /api/admin/seo/:id` returns one saved resource by persistent UUID.
Both succeed with 200 and `Cache-Control: private, no-store`.
No success envelope, pagination, default aliases or default/override flags are
introduced. Blank override fields remain blank; metadata inheritance is separate.

Both handlers use `withAdminApi` for configured-owner authorization, safe errors
and session cookie/header preservation. Missing identity returns 401; non-owner
returns 403. Missing owner configuration and unexpected provider/database failures
return safe 500 feedback without internal details. GET does not require Origin
or JSON content-type headers. These endpoints do not grant cross-origin browser
access or alter existing mutation-origin policy.

The item handler awaits Next.js promised route params, validates the ID as a UUID
after authorization, and returns 400/INVALID_REQUEST for malformed IDs without a
query. Valid absent IDs return 404/NOT_FOUND. There are no `defaults` or `contact`
ID aliases; clients use IDs from collection responses. The existing demo editor
routes are not yet integrated with this API.

`src/db/seo.ts` maps the existing SQL seo table and returns id/path/title/description
only. `listSeo()` orders the complete array by unique path; `readSeo(id)` uses a
parameterized primary-key lookup. Empty collections return []; absent items return
null. Neither query synthesizes defaults or resolves blank fields. Application DB
permissions and seed availability require live verification separately from tests.

No read service is needed: query output already equals the accepted projection,
and layer rules prohibit pass-through wrappers. Editor integration and public metadata resolution remain separate capabilities.
No SQL/schema/grants or hosted operations are part of these reads.

Route params and JSON responses follow installed Next.js guidance in
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`.


## Insert/update query layer

`insertSeo({ path, title, description })` issues one INSERT RETURNING and returns
canonical id/path/title/description. The mapping declares the existing PostgreSQL
`gen_random_uuid()` default; caller-supplied identity/timestamps are never written.
An unexpected missing insert result throws rather than pretending creation worked.
`updateSeo(id, values)` writes only those three fields to the matching persistent
ID and returns canonical content or null. It never inserts an absent record.
Existing SQL triggers own updated_at and protect the default record's identity.

These are internal persistence primitives, not HTTP operations. Services must
validate/normalize paths, enforce default/override rules and translate known
path-uniqueness failures into conflict feedback. Queries propagate database errors
and retain underlying driver causes. No upsert, conflict suppression, retry,
normalization, schema migration or hosted change is introduced by these queries.


## Creation/update service

`createSeo(values)` creates overrides only; `saveSeo(id, values)` reads the current
record and updates an existing default or override. Both capture the three input
strings before asynchronous work, return canonical saved content in a typed result,
and preserve title/description spacing. Paths normalize through existing
`normalizeSeoPath`; invalid input returns VALIDATION_ERROR with /path, /title or
/description issues. Shared domain schemas remain authoritative.

Creation and override updates cannot target `/`. Updating the saved `/` record
requires path `/` unchanged and both content fields nonblank. Overrides require
at least one nonblank content field. A missing update target, including disappearance
between read and update, returns NOT_FOUND without inserting a replacement.

The database unique constraint arbitrates normalized-path collisions, including
concurrent writes. A postgres-js 23505 error for constraint_name `seo_path_key`,
directly or as a DrizzleQueryError cause, maps to CONFLICT with /path feedback.
Other errors propagate unchanged for the HTTP safe-error boundary. There is no
collection preflight uniqueness check, retry or conflict overwrite. Existing SQL
constraints/triggers remain the final guard on uniqueness/default identity.

The service stays transport-independent. Local creation recovery, editor wiring
and public metadata invalidation remain separate slices.


## Shared domain and CMS boundaries

`src/seo/content.ts` owns UI-independent SEO values/input/record schemas, default
and override content validation, path normalization and inferred domain types.
The service imports those schemas/types directly, selecting default validation
from the persisted path. It converts schema issues to request-field API issues;
it does not import CMS error maps, demo records or validation-only identities.
The database imports its record type from the same domain module.

`src/cms/seo.ts` owns demo state, form error adapters, editor comparisons and
preview metadata resolution. Its contextual record schema extends the shared
override schema with editor identity and local duplicate feedback. Existing CMS
schema/type exports re-export the domain definitions so editor imports remain
compatible. Server uniqueness still relies on the database constraint, not that
editor collection check. Shared Zod rules can run on both sides without moving
client feedback or fixtures into server validation.


## Creation/update HTTP endpoints

`POST /api/admin/seo` accepts `{ path, title, description }`, creates an override
through `createSeo`, and returns 201 with canonical saved content and server UUID.
`PUT /api/admin/seo/:id` accepts the same body, updates that UUID through `saveSeo`,
and returns 200 with canonical saved content. Body identity/timestamps and extra
fields are rejected; route identity owns update targeting.

Both mutations compose same-origin → owner → JSON content-type guards, matching
existing Hero/About/Social policy. JSON charset parameters are accepted. PUT
awaits route params and validates UUID before parsing content. Strict shared
`seoInputSchema` validates body structure: malformed JSON/missing/extra/nonstring
fields return 400/INVALID_REQUEST. Service domain issues return 422 with field
pointers; path collisions 409 with /path feedback; absent update target 404.
Unexpected failures remain safe500. Session writes/private no-store use the
existing admin wrapper. No CORS policy or authentication logic changes.

Creation cannot target `/`; updating a default must retain `/` and provide both
content fields. Overrides preserve blank field inheritance and normalized paths.
Only the accepted create/save service owns those rules; routes contain no SQL or
editor validation. Creation recovery, editor wiring and public metadata integration remain separate
from these endpoints.


## Override deletion query

`deleteSeoOverride(id)` issues a single DELETE RETURNING restricted to matching
persistent ID and `path <> '/'`. It returns the removed saved record or null when
nothing matched. The predicate protects the default in the deleting statement,
independently of any earlier read; existing SQL triggers remain an additional
protection. Driver failures propagate without retries or alternate deletion.

The query deliberately does not distinguish a missing ID from a protected default;
the deletion service owns that application feedback. The HTTP handler uses the
service rather than calling this query directly. No schema, trigger,
grant or hosted data change is part of this implementation.


## Override deletion service

`deleteSeo(id)` reads the persisted record before invoking `deleteSeoOverride`.
An absent target returns NOT_FOUND; a record with path `/` returns CONFLICT with
safe default-protection feedback and no deletion attempt. Identity/default status
comes from saved data, never a client flag. The query retains its atomic default
exclusion independently of the service read.

Success returns the actually removed resource internally. No eligible row at the
delete step returns NOT_FOUND, including a target removed after the initial read.
Unexpected read/delete failures propagate unchanged to the future HTTP safe-error
boundary. There are no retries, fallback deletes, conflict overwrites or cache
side effects. The service is transport-independent; CMS confirmation/cache
integration remains later work.


## DELETE HTTP endpoint

`DELETE /api/admin/seo/:id` composes existing same-origin and owner guards,
awaits route params, validates the UUID, and calls `deleteSeo`. No request body
or content-type header is needed. Success is 204 with no response body or JSON
content type. The shared admin wrapper preserves session writes and private
no-store caching, including on empty success responses and failures.

Malformed UUID returns 400/INVALID_REQUEST; protected default returns 409/CONFLICT;
absent target before or during deletion returns 404/NOT_FOUND. Unauthenticated
and non-owner requests return 401/403, invalid origin returns 403, and unexpected
provider/database errors return safe 500 feedback. No CORS or authentication
policy changed. Confirmation UI, query invalidation and draft cleanup belong to
the later editor integration, not this transport handler.


## SEO list integration

`SeoList` reads the complete saved collection through `seoApi.list` and
`useSeoQuery`, under the studio's existing `CmsQueryProvider`. The account-scoped
key is `["cms", accountId, "seo"]`; the typed JSON client validates the collection
against shared domain record shapes, forwards AbortSignal and uses existing
no-retry defaults. No mutation hooks or alternative server-state provider are
introduced by list loading.

Initial loading uses shared `src/components/ui/LoadingState.tsx`: a centered
HeroUI Spinner with an accessible label and no visible loading text. Read/response failures show existing CMS error feedback without demo
fallback. The `/` record supplies saved metadata inheritance and is excluded from
override rows. Missing saved defaults is an initialization error, not an empty
successful list. A collection with just the default shows the existing empty
state. Client-side search, clear-search, fixed icons and navigation controls remain.
Override links use persistent IDs from the API response.

This is the list-loading slice only. Existing record/default loading and mutations
still use their prior editor implementation until their own integration slices;
server-ID links become fully usable as that record-loading slice is delivered.
No draft storage, recovery, editor form or public metadata behavior changes here.
