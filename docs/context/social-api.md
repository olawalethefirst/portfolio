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

Persisted public Social output remains separate work. This route follows installed Next.js guidance in
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`.


## Editor integration

`ContactEditor` reads/saves through `socialApi`, `useSocialQuery` and
`useSaveSocial`, using the studio CmsQueryProvider account identity. The query key
is `["cms", accountId, "social"]`. Reads receive AbortSignal; automatic retries
remain disabled. Save captures validated input, blocks duplicate submissions,
cancels active reads and adopts canonical server data. An unconfirmed response
invalidates the query but keeps the local form because the write may have succeeded.

The demo SocialProvider is replaced by editor-owned `useDraftStore` and shared
`useReconciledDraft`/`bindField`. The existing key remains
`portfolio:cms-drafts:v1:social:contact` with `{ id: "contact", value }`.
The form starts from saved server values; label-side actions select differing
local alternatives per field. Preview and Save use the assembled values.
Save and Discard clear recovery alternatives and release local form overrides;
failed saves preserve work. A late successful save uses guarded draft cleanup
so later work after navigation survives. Account-scoped draft storage/migration
and cross-tab coordination remain deferred.

Fields, source actions, Preview, Save and Discard lock while saving. Existing
URL validation, field icons, preview links and focus/scroll restoration remain.
Server field pointers map only to github/linkedin/x through the shared issue
mapper; unknown issues remain form feedback. Focus follows visual profile order.
Typing or choosing a source resets mutation feedback; loading failure displays
feedback without demo fallback or new authentication controls. Native URL inputs
retain browser whitespace sanitization; the API adapter/query does not introduce
additional normalization. Public links still use their existing separate data.
