# Social API

`GET /api/admin/social` returns the saved `{ github, linkedin, x }` resource.
`PUT /api/admin/social` replaces all three destinations and returns canonical
saved content. Success is 200; responses use `Cache-Control: private, no-store`.
These endpoints serve Contact/social editing only, not inquiry submission.

Both methods use `withAdminApi` for configured-owner authorization and safe
unexpected-error handling. No identity returns 401; a different user returns
403; missing owner configuration or unexpected database/provider failure returns
a safe 500. The existing session-response helper preserves SDK cookie writes,
deletions and headers on operation success or failure.

PUT checks same origin, owner authorization and JSON content type in that order.
Missing/opaque/mismatched Origin returns 403. Malformed JSON, missing fields,
extra fields or nonstring destinations return 400/INVALID_REQUEST. Complete
strings pass to `saveSocial`; invalid destinations return 422/VALIDATION_ERROR
with JSON Pointer issues at `/github`, `/linkedin` and `/x`.

Existing `socialSchema` requires complete HTTPS destinations with a hostname,
without internal whitespace or embedded credentials. Outer whitespace remains
accepted and stored unchanged. Hosts are not restricted to each platform's
domain. The service performs no URL fetching or normalization. Labels, icons and
order remain fixed in code. Unexpected persistence failures propagate to the
HTTP wrapper for safe serialization; internal details are never returned.

`src/db/social.ts` reads/updates existing `social_content` singleton id=1 and
exposes only github/linkedin/x. One UPDATE RETURNING yields canonical content;
no insert/upsert occurs. Missing initialized content returns 404/NOT_FOUND.
The existing SQL trigger owns updated_at; initialization remains seed-owned.
No schema/grants or hosted changes are included. Live database permissions must
be verified through the application connection, separately from automated tests.

Contact editor integration and persisted public Social output remain separate
work. This route follows installed Next.js guidance in
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`.
