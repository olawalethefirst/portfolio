# Database setup

## Decisions

The application uses one hosted Supabase PostgreSQL database, shared by local
application development and deployment. The Data API and automatic exposure of
new tables are disabled in the hosted project.

Supabase CLI owns SQL-first migrations. Versioned SQL files under
`supabase/migrations/` are the authoritative migration history in the repository.
Drizzle is the selected application query layer. `src/db/client.ts` exposes a
lazy, server-only `getDb()` using `drizzle-orm/postgres-js` and `postgres`.
Do not introduce a second migration history through Drizzle Kit.

The CLI is pinned as a development dependency. Run it with `pnpm exec supabase`.
The first content schema migration is prepared under `supabase/migrations/`.
See the [content contract](../contracts/cms-content-schema.md) for its table map
and integration boundaries. Required initial content is prepared separately in
[`supabase/seed.sql`](../../supabase/seed.sql).

Application permissions remain separate work. This migration enables RLS without
policies and supplies no application role grants. Required Hero, About, social and `/` SEO records must be initialized
before the application relies on them; no sample projects/publications are planned.

## Configuration boundaries

Keep `DATABASE_URL` in the existing ignored root `.env` file and in the deployed
application's environment settings. Never commit its value or prefix its name
with `NEXT_PUBLIC_`. The CLI does not automatically use this variable as its
migration target; the workflow below uses an explicitly linked hosted project.

`supabase/config.toml` is generated CLI configuration. Its service ports and
database version describe the optional local Docker stack; they do not configure
the hosted database. We do not start that stack for the current single-database
workflow. The generated PostgreSQL version is not confirmation of the hosted
version. Local Data API defaults mirror the disabled hosted settings, and
seeding is enabled with `sql_paths = ["./seed.sql"]`. Hosted pushes include the
seed when explicitly requested with `--include-seed`.

## Required content initialization

`supabase/seed.sql` copies current application defaults for Hero, About, social
destinations and default SEO (`path = '/'`). It creates no projects,
publications, overrides or media. Source paths are recorded beside the inserts.
These values initialize content once; subsequent edits belong in the dashboard.

Apply the schema migration and seed to the same confirmed hosted database with
`pnpm exec supabase db push --remote --include-seed`. The CLI applies migrations
before including the configured seed. The seed is transactional and uses targeted `ON CONFLICT DO NOTHING`:
rerunning it fills missing required rows without overwriting content or changing
existing IDs/timestamps. PostgreSQL generates the SEO record UUID. Do not reset
the shared database to seed it. `enabled = true` alone does not make an ordinary
`db push --remote` include the seed; keep `--include-seed` in the hosted workflow.

Controller verification: initialize an empty migrated database, confirm one row
per singleton and one `/` SEO record, edit a seeded value, then rerun the seed
and confirm the edited value and row identities remain intact. The seed grants
no application permissions and does not change RLS policies.

## Server database client

`getDb()` reads only `DATABASE_URL`, rejects missing/blank configuration without
printing it, and reuses one Drizzle client per server process, including local
development module reloads. Importing the module performs no query and does not
require credentials. Do not call it from Client Components or close its driver
after individual application requests. Table mappings and queries belong to the
entity implementation that needs them; no new tables or HTTP health route are
introduced by the connection module.

Use the hosted project's Shared pooler connection string for the Vercel Node.js
runtime. The driver sets `prepare: false` following
[Supabase's Drizzle guide](https://supabase.com/docs/guides/database/drizzle),
so transaction pooling does not require prepared-statement support. Connection
pool sizing/lifecycle should be verified against Vercel instance concurrency and
Supabase limits before deployment; a process-local client is not a global pool
shared by all deployed instances. TLS and connection parameters come from the
configured URI/driver; never disable certificate verification to fix a failure.

The `server-only` guard protects the module boundary in Next.js. Node scripts
importing this module outside Next.js must use `--conditions=react-server`.
Next.js loads environment files for the app; standalone Node checks use
`--env-file=.env` explicitly. No environment values are committed or logged.

### Controller connection check

Run from the repository root with the intended application `DATABASE_URL` in
the ignored `.env`. This uses the actual connection module and performs reads
only; it does not apply migrations or modify permissions:

```sh
node --conditions=react-server --env-file=.env --input-type=module <<'JS'
import { getDb } from './src/db/client.ts';
import { sql } from 'drizzle-orm';

const db = getDb();
try {
  const rows = await db.execute(sql`
    select current_user as database_role,
      (select count(*) from public.hero_content) as hero_records,
      (select count(*) from public.about_content) as about_records,
      (select count(*) from public.social_content) as social_records,
      (select count(*) from public.seo where path = '/') as default_seo_records
  `);
  console.log(rows);
} finally {
  await db.$client.end();
}
JS
```

Expected counts are one each. This proves the configured role's read path, not
its write permissions or application authentication. Keep provider/connection
error output private because a driver can include connection context.

### Application permissions still require review

The credential in `DATABASE_URL` is a PostgreSQL identity. It is independent of
Supabase API keys and the logged-in GitHub user. A Supabase secret API key does
not grant this connection privileges. Existing RLS-without-policies tables deny
ordinary roles; table owners/BYPASSRLS roles are not constrained by those policies.
Do not grant browser `anon`/`authenticated` access or disable RLS to connect.

Before choosing grants/policies, run the following with the **same application
connection**, e.g. replacing the SELECT inside the Node check above. SQL Editor
or a linked CLI query may use a different role, which would not verify the app.

```sql
select current_user as database_role, r.rolsuper, r.rolbypassrls,
  c.relname as table_name,
  pg_get_userbyid(c.relowner) = current_user as owns_table,
  c.relrowsecurity as rls_enabled,
  has_table_privilege(current_user, c.oid, 'SELECT') as can_select,
  has_table_privilege(current_user, c.oid, 'INSERT') as can_insert,
  has_table_privilege(current_user, c.oid, 'UPDATE') as can_update,
  has_table_privilege(current_user, c.oid, 'DELETE') as can_delete
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join pg_roles r on r.rolname = current_user
where n.nspname = 'public'
  and c.relname in (
    'hero_content', 'about_content', 'social_content', 'seo', 'media_assets',
    'projects', 'published_projects', 'publications', 'published_publications'
  )
order by c.relname;
```

These privilege flags alone do not prove row access under RLS. Review the role,
ownership and applicable policies together. Any custom role/grants/policies need
an explicitly reviewed design before new SQL is prepared or applied. Public
queries must later select published fields only; admin mutations must verify the
configured owner server-side. Neither boundary is implemented by `getDb()`.

## Migration workflow

Authenticate and link the existing hosted project once per checkout:

```sh
pnpm exec supabase login
pnpm exec supabase link --project-ref <project-ref>
```

Use the project reference shown in the Supabase dashboard. Enter credentials
through the CLI prompts. Generated local state and credentials remain ignored.

Create a migration, edit its SQL, and review it before applying:

```sh
pnpm exec supabase migration new <descriptive_name>
pnpm exec supabase migration list --remote
pnpm exec supabase db push --remote --include-seed --dry-run
pnpm exec supabase db push --remote --include-seed
```

These commands target the linked hosted project explicitly with CLI v3's
`--remote` flag. A dry run lists pending migrations; it does not prove the SQL
executes successfully. The CLI asks for confirmation before hosted changes.
Review the displayed target before confirming.

Commit migration SQL with the change it supports. Once applied to the shared
database, preserve the migration and add a new corrective migration for changes.
Avoid untracked schema edits through the dashboard. Database resets are not part
of this workflow because the target is the shared hosted database.

## Schema verification

The owner reports the original migration and required seed were applied
successfully on 2026-11-12. Preserve the applied migration; subsequent schema
changes require a new migration. Runtime verification remains controller-owned.

## References

- [Supabase CLI setup](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [SQL migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [CLI command reference](https://supabase.com/docs/reference/cli/introduction)
