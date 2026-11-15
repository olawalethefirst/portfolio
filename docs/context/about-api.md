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

## Editor integration

`AboutEditor` owns the existing about draft store and uses `useAboutQuery` and
`useSaveAbout` instead of the demo AboutProvider/context. The studio's existing
`CmsQueryProvider` supplies account identity and request/cache isolation.
`aboutApi` uses the shared typed JSON client; reads receive AbortSignal, requests
have no automatic retries, and successful saves update the account-specific
`["cms", accountId, "about"]` query with canonical server content. Save cancels
outstanding About reads and captures input once through `aboutSchema.parse`.
An unconfirmed network/malformed response invalidates the saved query but retains
local input, because a missing response does not prove the write failed.

Initial rendering waits for saved content. Read failures display existing CMS
feedback without demo fallback or new sign-in/recovery controls. Server validation
issues use an explicit heading/biography pointer allowlist; unknown issues remain
form feedback. Focus follows visual order and is guarded against unmounting.
Mutation state owns Save errors, which reset on typing, field source selection,
or Discard. Existing blur/local validation timing and Preview/CTA behavior remain.

Shared `useReconciledDraft` and `bindField` initialize the form from saved values
and expose differing draft alternatives through existing field-label actions.
The current About key remains `portfolio:cms-drafts:v1:about:about` with the same
`{ id, value }` format. Preview and Save use assembled form values, not unselected
alternatives. Successful Save and Discard clear candidates and release the form
override so it follows current query data again; failures preserve work. A late
successful save after navigation uses guarded cleanup to retain newer drafts.

Fields, source actions, Preview, Save and Discard lock during Save. The existing
Save icon is retained with HeroUI loading feedback; ghost source actions stay
icon-free. Initial loading also uses a Spinner. The former demo revision-counter
behavior is replaced by the same pending lock already used by Hero. No new
validation limits, normalization, field types or auth recovery UI are introduced.

Account-scoped local draft keys/migration and cross-tab coordination remain
separate from the existing account-scoped query cache.

## Public output

The server homepage awaits `connection()` before reading Hero and About in
parallel through their database query modules. Saved About heading and biography
pass as required content through `PrismHeroLayoutLab` to `AboutCtaSection`.
The existing biography rendering, motion behavior and fixed contact CTA remain.
Missing singleton content or database failure fails the page instead of showing
sample copy. Public rendering does not call the protected admin API.

Each full homepage request reads current saved content. No persistent data cache,
ISR, browser fetch or public query cache is introduced, so About Save needs no
server cache invalidation. An already open page is not updated live; reload to
see a later save. This follows the installed Next.js `connection()` and parallel
Server Component database-read guidance in
`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md`
and `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`.
