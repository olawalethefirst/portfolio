# CMS content schema

Status: current content-field contract with a first SQL migration prepared for
review; not applied to the hosted database.

This replaces the earlier SQL proposal, which predated the current CMS fields.
The inventories below describe implemented inputs and behavior. The SQL mapping
below records the selected storage structure. See the
[CMS UI specification](../context/cms-ui-spec.md) and
[database setup](../context/database-setup.md).

## Scope

Editorial content includes Hero, About, Projects, Publications, social links and
SEO. Layout, navigation, control labels, contact-intent descriptions, form copy,
validation messages and appearance settings remain in code. Visitor submissions
are separate from editorial content.

Field names below use current application names, not finalized SQL column names.
The confirmed default SEO path is an addition to the current application shape,
as noted in the SEO section.
The authoritative input shapes are in `src/cms/`; text budgets are in
`src/config/content-limits.ts`.

## Hero

One content record with three fixed stages.

| Field | Type | Explicit Save requirement |
|---|---|---|
| `eyebrow` | Text | Nonblank; at most 16 characters |
| `headline` | Text | Nonblank; at most 20 characters |
| `stages.idea.tagline` | Text | Nonblank; at most 26 characters |
| `stages.idea.description` | Text | Nonblank; at most 56 characters |
| `stages.iterate.tagline` | Text | Nonblank; at most 26 characters |
| `stages.iterate.description` | Text | Nonblank; at most 56 characters |
| `stages.solution.tagline` | Text | Nonblank; at most 26 characters |
| `stages.solution.description` | Text | Nonblank; at most 56 characters |

Stage keys stay fixed; both taglines and descriptions are editable.

## About

One content record.

| Field | Type | Explicit Save requirement |
|---|---|---|
| `heading` | Text | Nonblank |
| `biography` | Text | Nonblank |

## Projects

An ordered collection. Each record has an `id`, saved `draft` and nullable
`published` content snapshot. Both snapshots contain these fields:

| Field | Type | Publish requirement |
|---|---|---|
| `name` | Text | Nonblank; at most 11 characters |
| `summary` | Text | Nonblank; at most 92 characters |
| `what` | Text | Nonblank; at most 228 characters |
| `how` | Text | Nonblank; at most 294 characters |
| `platform` | Enum | `web` or `mobile` |
| `screenshot` | Image source string | Required |
| `screenshotAlt` | Text | Nonblank |
| `liveUrl` | URL string | Complete HTTPS destination |

Save accepts unfinished strings while preserving the platform enum
shape. What/How replace the former project solution labels. There is no current
slug input or project-solutions catalogue.

## Publications

An ordered collection. Each record has an `id`, saved `draft` and nullable
`published` content snapshot. Both snapshots contain these fields:

| Field | Type | Publish requirement |
|---|---|---|
| `title` | Text | Nonblank; at most 40 characters |
| `summary` | Text | Nonblank; at most 112 characters |
| `kind` | Enum | `local` or `external` |
| `bodyMarkdown` | Markdown text | Nonblank when kind is `local` |
| `externalUrl` | URL string | Complete HTTPS destination when kind is `external` |
| `coverSrc` | Image source string | Required |
| `coverAlt` | Text | Nonblank |
| `tagsText` | Comma-separated editor input | At most 3 distinct tags; at most 16 characters each |
| `publishedOn` | Date input string | Valid `YYYY-MM-DD`, today or earlier |

The current editor accepts unfinished strings while preserving the kind enum
shape. For database persistence, the publication date is a nullable `date`:
store a valid date or NULL, never unfinished date text. Server integration must
map the editor's empty date to NULL and report invalid nonempty dates before
saving. Browser working drafts may retain unfinished input.
Tags are trimmed, empty entries discarded, and duplicates removed ignoring case
while retaining the first spelling and order. `tagsText` is the editor format;
physical tag storage is a schema decision.

Switching kind preserves the inactive body or external URL. Do not require one
of those stored values to be absent: only the selected kind determines the
published destination. Scheduling is not currently supported. The date field
is editorial content, separate from system creation/update timestamps.

## Contact / social

One saved set of fixed profile destinations.

| Field | Type | Explicit Save requirement |
|---|---|---|
| `github` | URL string | Complete HTTPS URL with hostname, no whitespace or embedded credentials |
| `linkedin` | URL string | Same URL rules |
| `x` | URL string | Same URL rules |

Profile labels, icons and order stay fixed in code. Current validation does not
restrict each URL to its platform's domain. The current application key is `x`,
not the former proposal's `twitter-x` database key. Contact-intent descriptions
are static; no editable contact-intent content table is required.

## SEO

| Record | Fields | Explicit Save requirement |
|---|---|---|
| Default record in shared SEO table | `id`, `path`, `title`, `description` | Path fixed to `/`; title and description both nonblank |
| Override records in shared SEO table | `id`, `path`, `title`, `description` | Unique normalized site path; at least one nonblank override |

The default SEO record has the fixed path `/`. Its title and description also
remain the fallback for paths without overrides. Defaults and overrides share
one table with a unique path. Default updates target `/`; its path cannot change
and the record cannot be deleted. Homepage metadata and global fallback values
are therefore the same record. The current application defaults
model contains only title/description and its editor hides the path; aligning
that implementation with this confirmed contract remains application work.

Override paths start with `/` and identify exact routes, including local article routes.
They are not restricted to a fixed home/contact enum. Query strings, fragments,
route patterns, whitespace and traversal segments are rejected. Path
normalization and uniqueness follow `normalizeSeoPath` in `src/cms/seo.ts`.

Each blank override field inherits its corresponding site default, independently.
The current resolver does not automatically substitute publication title/summary.
Separate page and publication SEO tables are not required by the current editor.

## Persistence and lifecycle requirements

- Hero, About, social and SEO use explicit Save operations; they do not currently
  expose separate Publish/Unpublish operations.
- Projects and publications preserve separate saved drafts and published
  snapshots. Save updates only the draft; Publish replaces both with submitted
  values; Unpublish removes the published snapshot while retaining the draft.
  A single mutable row with only a status flag cannot preserve this behavior.
- Project and publication ordering is explicit and separate from content
  snapshots. Persist collection order and use a stable tie-breaker if positions
  can coincide. Ordering is not a content field typed into an editor.
- Draft/Published/Published-with-unpublished-changes is derived from snapshot
  presence and comparison. It need not be a separately editable status field.
- Browser working drafts are distinct from explicitly saved server drafts. The
  [local-draft contract](../context/cms-local-drafts.md) covers future server
  reconciliation and revision checks.
- Draft persistence permits unfinished text such as a blank title or unfinished
  URL. Dates are the exception: a saved draft stores a valid date or NULL;
  unfinished date input belongs only to the browser working draft. Publishing
  requires a valid, non-NULL date.
- Text budgets currently count JavaScript UTF-16 code units. PostgreSQL character
  counts are not equivalent for all Unicode characters; do not silently change
  the validation contract when translating limits into SQL.
- Preserve the restricted Markdown rendering policy; content is not executable
  MDX. Validate destinations when integrating server reads and writes.

## SQL mapping

The first migration is
[`20261110094331_create_cms_content.sql`](../../supabase/migrations/20261110094331_create_cms_content.sql).

| Content | Storage |
|---|---|
| Hero | `hero_content`, fixed `id = 1`; all three stages stored as columns in that row |
| About | `about_content`, fixed `id = 1` |
| Social | `social_content`, fixed `id = 1`; GitHub, LinkedIn and X URL columns |
| Project saved draft and identity | `projects`, including position and nullable screenshot asset reference |
| Project live snapshot | `published_projects`, keyed by its parent project ID |
| Publication saved draft and identity | `publications`, including position, raw tag input, nullable date and nullable cover asset reference |
| Publication live snapshot | `published_publications`, keyed by its parent publication ID; publication date stored as `date` |
| Inline Markdown images | Image destinations remain in `body_markdown`; no separate usage-reference tables |
| SEO defaults and overrides | `seo`, with unique canonical path; `/` identifies the protected default |
| Uploaded images | `media_assets`, with stable UUID and unique bucket/object-key pair |

Published rows require nonblank content and image descriptions, media references
and (for publications) a date. The selected publication kind determines whether
body or external destination is required; inactive content is preserved. Exact
URL validation, UTC no-future-date validation, tag rules, Markdown safety, SEO
path normalization and UTF-16 budgets remain server responsibilities. The SQL
constraints do not replace those application validators.

Create/edit operations write saved draft rows. Publish must validate the captured
submission, update the draft and upsert its published snapshot in one transaction.
Unpublish deletes only the published row. Delete removes the parent and
its published snapshot. Media metadata is retained until
explicit asset cleanup. Public reads must use published content, joining the
parent only for identity/order, never for editable draft fields.

Order by `position, id`. Positions are nonnegative but may coincide; reordering
multiple records must be transactional. `updated_at` is maintained on updates
by triggers. Timestamp-based optimistic locking is not supplied by this schema;
the revision-token/concurrent-save contract must be addressed during server
integration before using local-draft reconciliation.

Fixed singleton keys permit at most one row per table. Delete/truncate triggers
protect initialized singleton records. The SEO default also cannot be deleted,
truncated or have its identity/path changed. The migration creates no content
rows: required singleton/default initialization is a separate data step, before
application integration. Projects and publications start empty.

## Media references

Image inputs currently hold source strings, including prototype data URLs. A
production upload integration must map these to asset IDs. Files belong in
object storage; application-owned `media_assets` records hold bucket/object
keys without referencing Supabase's managed `storage` tables. This keeps content
references stable when files move providers. Storage host/provider selection
belongs to server configuration. Do not persist prototype data URLs or expiring
signed URLs in media records.

Alt text belongs to each image usage and is required for publishing. Asset-level default
alt text and an upload metadata catalogue are not currently editable CMS fields;
add them only with an explicit upload contract. Screenshot and cover foreign
keys block asset-record deletion while referenced by saved drafts or published
snapshots. Inline images are recorded only in Markdown, so those uses are not
protected by foreign keys. Before gallery deletion or orphan cleanup is enabled,
the service must scan both saved draft and published Markdown for asset usage
and account for concurrent edits. Unsaved browser drafts are not visible to the
database; unreferenced uploads need a grace period rather than immediate cleanup.
Foreign keys protect metadata, not the physical object: upload/delete services
must coordinate storage operations with database changes. Upload cleanup,
Markdown asset resolution and storage bucket policies are separate work.

Database IDs are UUIDs except for singleton keys. Parent project/publication
rows own creation timestamps. Slugs are not current inputs and are not added;
route identity is addressed during application integration. No seed content is
included in this migration.

Permissions remain deferred. The hosted Data API and automatic table exposure
are disabled. All new tables have RLS enabled without policies; no client access
grants are introduced. Owners and bypass-RLS roles are not restricted by those
policies. This content contract does not replace server-side authorization for
later application integration.

## Visitor data: separate scope

These fields exist in visitor interfaces; persistence is not authorized by the
editorial schema contract.

| Submission | Current data |
|---|---|
| Contact inquiry | `intent` (`hire`, `collaborate`, `contact`), `goal`, `name`, `email` |
| Publication comment/reply | Author name, Markdown body, publication association, optional parent-comment association |

The contact form accepts a trimmed goal of at least 10 characters (input maximum
2000), nonblank name (input maximum 100), and validated email (input maximum
254). Comment inputs require nonblank name/body, with input maxima of 80 and
5000 respectively. These UI limits must be enforced server-side if submission
persistence is implemented.

Comment IDs/timestamps and relationships need database design; a displayed
comment count is derived. Moderation, reply rules, abuse protection, retention
and visitor permissions remain separate decisions before enabling persistence.
