# SEO API reads

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
and layer rules prohibit pass-through wrappers. Creation/update/deletion,
editor integration and public metadata resolution remain separate capabilities.
No SQL/schema/grants or hosted operations are part of these reads.

Route params and JSON responses follow installed Next.js guidance in
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`.
