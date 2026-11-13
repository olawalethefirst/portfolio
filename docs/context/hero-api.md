# Hero API

`GET /api/admin/hero` reads the required `hero_content` singleton.
`PUT /api/admin/hero` replaces its complete editable content and returns the
saved resource. Both return the direct HeroDraft shape with status 200 and
`Cache-Control: private, no-store`. Neither operation initializes missing content;
a missing row returns 404. The existing seed owns initialization.

The endpoint verifies the configured owner through Supabase `getUser`, independently
of Proxy. Missing owner/auth configuration returns a safe 500; absent identity
returns 401 and a different identity returns 403. Auth cookie updates, including
deletions, and SDK cache headers survive successful and failed operations.
PUT requires a matching Origin and application/json. Missing/extra fields at
any nesting level, wrong types and malformed JSON return 400. Complete typed
content that violates existing Hero rules returns 422 with JSON Pointer issues.
Input strings are preserved rather than normalized.

The endpoint owns HTTP/structural checks. `src/cms/hero-service.ts` applies the
existing `heroSchema` Save rules and returns application results. `src/db/hero.ts`
maps the applied SQL columns to the nested resource and uses parameterized
Drizzle reads/updates. UPDATE RETURNING supplies canonical saved content; it
never inserts or upserts. The database trigger owns `updated_at`, which is not
part of the editable resource. Unexpected database failures return generic 500
feedback without exposing connection or provider details.

These handlers do not change database permissions. The configured application
PostgreSQL role must have effective row read/update access under the existing
RLS configuration. Verify permissions using the application connection as
described in [database setup](database-setup.md). A permission failure is a server
failure, not a 403 for the owner. Do not automatically retry writes after a lost
response; the outcome can be unknown.

The Hero editor now uses these endpoints through `src/cms/hero-api.ts` and
TanStack Query. Public server reads/cache invalidation remain a separate slice;
editor saves do not yet change the public page's content source.

## Hero editor integration

The studio layout supplies the configured owner UUID as a server-state cache namespace.
Proxy verifies the user against that owner before studio navigation; the namespace
does not itself authorize access. Every API operation independently checks owner
authorization. No session-discovery endpoint or additional browser SDK is added.

`CmsQueryProvider` owns an in-memory QueryClient per mounted account boundary and
clears it on unmount/account changes. Hero keys include the account ID. GET receives
an AbortSignal; Save cancels outstanding Hero reads before sending PUT and updates
the cache with the canonical response. Queries/mutations have no automatic retries.
Lost or malformed save responses trigger a fresh read, preserving local input.
Server rejection, unexpected response and transport failures remain distinguishable
in `ApiRequestError`; status, error codes and all issues are preserved.

`useHeroQuery` and `useSaveHero` in `src/cms/hero-queries.ts` own Hero server-state
operations; there is no Hero context/provider in the studio layout. `HeroEditor`
owns its existing draft store and passes it to its form. The save hook
validates and captures the submitted snapshot once through `heroSchema.parse`,
which returns a deep copy. The editor does not clone it again. The fixed API pointer
mapping is a literal read-only map; it never stores error messages.

API error codes are defined in `src/api/errors.ts`, shared with the client response
schema. The server's status map is exhaustively typed against the same codes.

The editor waits for real saved content instead of using sample content as a
remote baseline. Load failures use existing CMS feedback. Authentication recovery belongs to the global
application policy; Hero adds no sign-in navigation or recovery controls.
Save feedback and field errors are derived from mutation state, reset on edit or
discard, with fields and actions disabled while Save is pending.
Server field issues use an explicit
Hero pointer allowlist and visual focus order; unmapped issues remain general
feedback. Late failures cannot invalidate newer input or focus an unmounted form.

This iteration is limited to server state. The existing local draft store,
`portfolio:cms-drafts:v1:hero:hero` key and `{ id, value }` format remain unchanged.
No original-baseline metadata, account-scoped draft format, migration, merge or
conflict-review UI is implemented. Reconciliation is deferred to a shared
implementation in the next iteration, per owner direction.

Save advances the query's saved baseline and adopts the canonical response.
Fields, Save, Discard and Preview are disabled during Save; the existing Button
loading indicator shows a HeroUI spinner. Initial loading also shows a spinner.
Revision tracking is unnecessary because editing is blocked during Save.
Discard uses the latest fetched/saved server baseline. A
background read never automatically replaces the working draft. Local drafts
still lack account isolation and original-snapshot comparison, as documented in
[local draft limitations](cms-local-drafts.md#scope-and-limitations).

Implementation references for the client boundary:
[TanStack mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations),
[query cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation),
and [server/client QueryClient ownership](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr).

Implementation references: the installed Next.js Route Handler guide,
[Drizzle select](https://orm.drizzle.team/docs/select),
[Drizzle update/returning](https://orm.drizzle.team/docs/update), and
[Zod object validation](https://zod.dev/api).
