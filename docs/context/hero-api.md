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

Editor queries/mutations, draft reconciliation, and public server reads/cache
invalidation remain separate integration slices. These endpoints alone do not
change what the editor saves or the public page renders.

Implementation references: the installed Next.js Route Handler guide,
[Drizzle select](https://orm.drizzle.team/docs/select),
[Drizzle update/returning](https://orm.drizzle.team/docs/update), and
[Zod object validation](https://zod.dev/api).
