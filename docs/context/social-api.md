# Social API

`GET /api/admin/social` returns the saved `{ github, linkedin, x }` resource.
`PUT /api/admin/social` replaces all three destinations and returns canonical
saved content. Both succeed with 200. GET is public with `Cache-Control: no-store`;
PUT remains configured-owner only with `private, no-store`. These resources are
public profile destinations, not inquiry submissions.

GET uses `withPublicRead`, with no session/configuration/identity requirement or
auth cookies. PUT uses `withAdminApi`: no identity401, non-owner403, missing owner
configuration or unexpected failures safe500. Session writes survive PUT success
and failure. Public read database failures also use safe500 without details.

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

This route follows installed Next.js guidance in
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
additional normalization. Public destinations use the server read described below.


## Public output

The `/contact` server page awaits `connection()` and reads saved destinations
through `readSocial`. Missing singleton or database failure fails the page rather
than rendering default profile links. The required destinations prop passes
through the public ContactPreview into ContactConversationSection/SocialLinks.
The convenience section keeps optional destinations for standalone consumers;
the actual public page always supplies the saved resource.

Public links reuse `socialProfileHref` to resolve valid HTTPS strings, including
outer whitespace, and disable invalid destinations without substituting defaults.
Fixed profile labels, icons, order, new-tab/rel behavior and the inquiry form are
preserved. This slice adds no inquiry persistence or delivery.

Each full Contact request reads current saved values. There is no persistent
server data cache, ISR or browser API request, so Save requires no server cache
invalidation. Existing open pages are not live-updated; fully reload to see later
saves. This follows the installed Next.js connection() reference at
`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md`.
