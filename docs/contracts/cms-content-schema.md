# CMS content schema

Status: current content-field contract for schema review; not an applied migration.

This replaces the earlier SQL proposal, which predated the current CMS fields.
The inventories below describe implemented inputs and behavior. Physical table
layout, keys and lifecycle operations must be reviewed before writing the first
SQL migration. See the [CMS UI specification](../context/cms-ui-spec.md) and
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

Save accepts unfinished strings while preserving the kind enum shape.
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
- Draft persistence must permit unfinished input. Publish-only requirements must
  not prevent saving a draft, including a blank title or unfinished date/URL.
- Text budgets currently count JavaScript UTF-16 code units. PostgreSQL character
  counts are not equivalent for all Unicode characters; do not silently change
  the validation contract when translating limits into SQL.
- Preserve the restricted Markdown rendering policy; content is not executable
  MDX. Validate destinations when integrating server reads and writes.

## Media and system fields: decisions before migration

Image inputs currently hold source strings, including prototype data URLs. A
production upload design must map these to durable storage references. Files
belong in object storage, with any database asset records holding bucket/object
keys and metadata. Do not carry prototype data URLs or expiring signed URLs into
permanent media records by default.

Alt text belongs to each image usage and is required for publishing. Asset-level default
alt text and an upload metadata catalogue are not currently editable CMS fields;
add them only with an explicit upload contract. Media deletion must account for
references from both saved drafts and published snapshots.

Database IDs, created/updated timestamps, collection positions, revision tokens,
physical snapshot storage and route identifiers are implementation decisions.
Slugs are not current inputs. Decide route identity before adding slug columns.
No seed content is approved yet. Singleton/fixed-stage initialization and empty
collection behavior must be agreed before application integration.

Permissions remain deferred. The hosted Data API and automatic table exposure
are disabled. This content contract does not grant access or replace server-side
authorization for later application integration.

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
