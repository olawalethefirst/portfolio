# About API

`GET /api/admin/about` returns saved `{ heading, biography }` content.
`PUT /api/admin/about` replaces the complete editable resource and returns the
canonical saved resource. Both succeed with status 200 and
`Cache-Control: private, no-store`.

Both handlers use `withAdminApi` to verify the configured owner independently
of studio navigation. Missing identity returns 401; a different identity returns
403; missing configuration or unexpected provider/database failures return safe
500 feedback. Session cookies, deletions, and response headers survive operation
success and failure through the existing shared response utility.

PUT composes same-origin, owner, and JSON content-type guards in that order.
Malformed JSON, missing fields, extra fields, or wrong types return 400.
Complete typed strings that violate `aboutSchema` return 422 with JSON Pointers
`/heading` and `/biography`. Both must be nonblank; no additional length limits
or normalization are introduced. Input spacing, newlines, and Markdown remain
unchanged. HTTP validation stays in the route; business validation is owned by
`src/cms/about-service.ts`.

`src/db/about.ts` reads/updates only `about_content` singleton id=1. UPDATE
RETURNING supplies canonical content; the existing trigger owns updated_at.
Neither endpoint inserts or upserts. An absent initialized row returns 404;
initialization remains seed-owned. Hosted read/update permissions under existing
RLS must be verified using the application connection; no automatic grants or
schema changes are included. Unexpected permission failures are safe 500 errors,
not a claim that the authenticated owner lacks authorization.

The About editor still uses its existing local/in-memory provider, and public
About output still uses sample content. Query/editor reconciliation and public
server-side reads are separate follow-up slices. Do not retry writes
automatically after an unconfirmed response.
