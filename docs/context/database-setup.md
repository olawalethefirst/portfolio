# Database setup

## Decisions

The application uses one hosted Supabase PostgreSQL database, shared by local
application development and deployment. The Data API and automatic exposure of
new tables are disabled in the hosted project.

Supabase CLI owns SQL-first migrations. Versioned SQL files under
`supabase/migrations/` are the authoritative migration history in the repository.
Drizzle is the selected application query layer; its server integration is
separate work. Do not introduce a second migration history through Drizzle Kit.

The CLI is pinned as a development dependency. Run it with `pnpm exec supabase`.
No initial schema migrations or seed data have been defined yet.

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
seeding is disabled until seed data is agreed.

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
pnpm exec supabase db push --remote --dry-run
pnpm exec supabase db push --remote
```

These commands target the linked hosted project explicitly with CLI v3's
`--remote` flag. A dry run lists pending migrations; it does not prove the SQL
executes successfully. The CLI asks for confirmation before hosted changes.
Review the displayed target before confirming.

Commit migration SQL with the change it supports. Once applied to the shared
database, preserve the migration and add a new corrective migration for changes.
Avoid untracked schema edits through the dashboard. Database resets are not part
of this workflow because the target is the shared hosted database.

## References

- [Supabase CLI setup](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [SQL migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [CLI command reference](https://supabase.com/docs/reference/cli/introduction)
