# CMS content schema

Status: superseded proposal for UI scope; not an applied migration.

Use [CMS UI specification](../context/cms-ui-spec.md) for current scope. This
proposal predates the decisions to keep contact intents static, edit Hero
taglines, and replace project solutions with What/How. Do not implement this SQL
without a separately reviewed backend specification.

Scope: editable editorial content only. Layout, behavior, navigation, control
labels, form copy, and validation messages remain in code. Supabase PostgreSQL
stores content; Supabase Storage stores uploaded files.

The SQL below specifies entity fields and database constraints. UUIDs and
timestamps are system fields. Slugs, publication status, and list positions are
proposed CMS additions. Length limits beyond non-empty text remain a product
decision; this contract does not invent editorial limits.

## Editorial entities

```sql
-- NULL represents an absent optional value; required text cannot be blank.
create domain cms_text as text
  check (length(btrim(value)) > 0);

-- Internal records, populated by the upload service, not manual CMS inputs.
-- Files must be uploaded successfully before a media record is created.
create table media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket_id cms_text not null,
  object_key cms_text not null,
  default_alt_text text not null default '',
  created_at timestamptz not null default now(),
  unique (bucket_id, object_key)
);

create table homepage_content (
  id boolean primary key default true check (id),
  hero_eyebrow cms_text not null,
  hero_headline cms_text not null
);

-- Fixed keys correspond to existing frontend states; labels/taglines stay in code.
create table hero_stage_content (
  stage_key text primary key
    check (stage_key in ('idea', 'iterate', 'solution')),
  description cms_text not null
);

create table about_content (
  id boolean primary key default true check (id),
  heading cms_text not null,
  biography cms_text not null
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name cms_text not null,
  summary cms_text not null,
  platform text not null check (platform in ('mobile', 'web')),
  screenshot_asset_id uuid not null references media_assets(id) on delete restrict,
  screenshot_alt_text text,
  live_url cms_text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ordered labels owned by a project, rather than a new services catalogue.
create table project_solutions (
  project_id uuid not null references projects(id) on delete cascade,
  position integer not null check (position >= 0),
  label cms_text not null,
  primary key (project_id, position),
  unique (project_id, label)
);

create table publications (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title cms_text not null,
  summary cms_text not null,
  body_markdown cms_text,
  external_url cms_text,
  cover_asset_id uuid not null references media_assets(id) on delete restrict,
  cover_alt_text text,
  published_on date,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or published_on is not null),
  check (status <> 'published' or
    ((body_markdown is not null) <> (external_url is not null)))
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  name cms_text not null
);
create unique index tags_name_unique on tags (lower(btrim(name)));

create table publication_tags (
  publication_id uuid not null references publications(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete restrict,
  position integer not null check (position >= 0),
  primary key (publication_id, tag_id),
  unique (publication_id, position)
);

create table social_profiles (
  platform text primary key check (platform in ('github', 'linkedin', 'twitter-x')),
  profile_url cms_text not null,
  position integer not null default 0 check (position >= 0)
);

create table contact_intent_content (
  intent_key text primary key check (intent_key in ('hire', 'collaborate', 'contact')),
  description cms_text not null
);

create table site_seo (
  id boolean primary key default true check (id),
  default_title cms_text not null,
  default_description cms_text not null
);

-- Static page keys stay tied to implemented routes, not arbitrary CMS pages.
create table page_seo (
  page_key text primary key check (page_key in ('home', 'contact')),
  title cms_text,
  description cms_text
);

-- Publication SEO has a real FK, avoiding an unvalidated polymorphic page ID.
create table publication_seo (
  publication_id uuid primary key references publications(id) on delete cascade,
  title cms_text,
  description cms_text
);
```

## Relationships and interpretation

- Homepage, About, and site SEO are singletons: the boolean key permits at most
  one row. Initial setup must create their rows.
- Hero stages and contact intents each need all three fixed-key rows. Their
  checks restrict allowed keys; seed/setup verification ensures completeness.
- Each project owns an ordered list of solution labels. Each publication has an
  ordered set of shared tags. Cards and detail pages read the same record.
- A published publication has either a local Markdown body or an external URL.
  Drafts can omit both. External publications link out instead of rendering a
  local article. Future dates do not imply scheduling in this contract.
- Alt-text overrides are optional. NULL uses the asset default; an empty string
  explicitly marks a decorative usage. The upload form requests default alt text;
  the publication/project editor can override it where appropriate.
- Reading time, table of contents, formatted dates, and comment counts are
  derived. Storage URLs are generated from bucket/object keys, not persisted
  expiring signed URLs. File properties remain automatic storage metadata.
- Position controls ordering within content lists, not section order or layout.
  Use ID/platform as a stable tie-breaker when positions match.
- Missing SEO overrides inherit the relevant publication title/summary or site
  defaults. Existing lab route labels are not new editorial entities.

## Validation and access contract

- Server validation parses URLs and permits HTTPS for project, social, and
  external publication destinations. Public links must never execute scripts.
- Markdown is content, not executable MDX. Rendering must preserve the existing
  restricted rendering policy and validate links and image destinations.
- `updated_at` requires a trigger or explicit server assignment on each update;
  its default alone does not update existing rows.
- File references restrict deleting referenced media records. Storage deletion
  must go through the service, checking references before deleting the object.
  SQL cannot make an object upload/delete atomic with a content transaction.
- Enable RLS before exposing tables through Supabase APIs. Only authorized CMS
  editors may write. Public content queries must expose published projects and
  publications only, including equivalent filtering of their relationships and
  SEO. Public Storage buckets are suitable only for intentionally public files;
  draft-only uploads require private access or an explicit promotion strategy.
- Draft rows are not a revision system. Preserving a live version while editing
  requires a separate revision/publication design before implementing that flow.

## Visitor data: separate proposed schemas

These records support the existing comment and contact interfaces. They are not
editorial content. Persistence, moderation, retention, and access policies are
separate decisions and are not authorized by this content contract.

```sql
create table publication_comments (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references publications(id) on delete restrict,
  parent_id uuid,
  author_name cms_text not null,
  body_markdown cms_text not null,
  created_at timestamptz not null default now(),
  unique (id, publication_id),
  foreign key (parent_id, publication_id)
    references publication_comments(id, publication_id) on delete restrict,
  check (parent_id is null or parent_id <> id)
);

create table contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  intent_key text not null check (intent_key in ('hire', 'collaborate', 'contact')),
  goal text not null check (length(btrim(goal)) between 10 and 2000),
  name text not null check (length(btrim(name)) between 1 and 100),
  email text not null check (length(btrim(email)) between 1 and 254),
  created_at timestamptz not null default now()
);
```

Server validation must validate email syntax. Comment parent links must remain
immutable after creation and server validation must enforce the supported reply
depth; the FK prevents cross-publication replies but not longer cycles. Neither
visitor table should allow unrestricted public reads/writes. Contact inquiries
contain private data. Moderation status and abuse protection must be specified
before comment submission is enabled.
