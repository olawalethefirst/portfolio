-- Editorial content only. No visitor data, sample content, access policies,
-- storage buckets or hosted configuration changes are included.
-- Server validation remains authoritative for URL semantics, normalized SEO
-- paths, Markdown, tag parsing and JavaScript UTF-16 editorial budgets.

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null check (btrim(bucket) <> ''),
  object_key text not null check (btrim(object_key) <> ''),
  created_at timestamptz not null default now(),
  unique (bucket, object_key)
);

-- Fixed columns keep all three Hero stages together in one atomic save.
create table public.hero_content (
  id smallint primary key default 1 check (id = 1),
  eyebrow text not null check (btrim(eyebrow) <> ''),
  headline text not null check (btrim(headline) <> ''),
  idea_tagline text not null check (btrim(idea_tagline) <> ''),
  idea_description text not null check (btrim(idea_description) <> ''),
  iterate_tagline text not null check (btrim(iterate_tagline) <> ''),
  iterate_description text not null check (btrim(iterate_description) <> ''),
  solution_tagline text not null check (btrim(solution_tagline) <> ''),
  solution_description text not null check (btrim(solution_description) <> ''),
  updated_at timestamptz not null default now()
);

create table public.about_content (
  id smallint primary key default 1 check (id = 1),
  heading text not null check (btrim(heading) <> ''),
  biography text not null check (btrim(biography) <> ''),
  updated_at timestamptz not null default now()
);

create table public.social_content (
  id smallint primary key default 1 check (id = 1),
  github text not null check (btrim(github) <> ''),
  linkedin text not null check (btrim(linkedin) <> ''),
  x text not null check (btrim(x) <> ''),
  updated_at timestamptz not null default now()
);

-- These rows contain saved drafts, not public content. Incomplete strings and
-- missing images are valid. Position belongs to the identity, not the snapshot.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  position integer not null default 0 check (position >= 0),
  name text not null default '',
  summary text not null default '',
  what text not null default '',
  how text not null default '',
  platform text not null default 'web' check (platform in ('web', 'mobile')),
  screenshot_asset_id uuid references public.media_assets(id) on delete restrict,
  screenshot_alt text not null default '',
  live_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.published_projects (
  project_id uuid primary key references public.projects(id) on delete cascade,
  name text not null default '',
  summary text not null default '',
  what text not null default '',
  how text not null default '',
  platform text not null default 'web' check (platform in ('web', 'mobile')),
  screenshot_asset_id uuid references public.media_assets(id) on delete restrict,
  screenshot_alt text not null default '',
  live_url text not null default '',
  updated_at timestamptz not null default now(),
  constraint published_projects_complete check (
    btrim(name) <> '' and btrim(summary) <> '' and btrim(what) <> ''
    and btrim(how) <> '' and screenshot_asset_id is not null
    and btrim(screenshot_alt) <> '' and btrim(live_url) <> ''
  )
);

create table public.publications (
  id uuid primary key default gen_random_uuid(),
  position integer not null default 0 check (position >= 0),
  title text not null default '',
  summary text not null default '',
  body_markdown text not null default '',
  cover_asset_id uuid references public.media_assets(id) on delete restrict,
  cover_alt text not null default '',
  -- Keep raw tag input; a draft date is either valid or absent.
  tags_text text not null default '',
  published_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.published_publications (
  publication_id uuid primary key references public.publications(id) on delete cascade,
  title text not null default '',
  summary text not null default '',
  body_markdown text not null default '',
  cover_asset_id uuid references public.media_assets(id) on delete restrict,
  cover_alt text not null default '',
  tags_text text not null default '',
  published_on date,
  updated_at timestamptz not null default now(),
  constraint published_publications_complete check (
    btrim(title) <> '' and btrim(summary) <> '' and cover_asset_id is not null
    and btrim(cover_alt) <> '' and published_on is not null
    and btrim(body_markdown) <> ''
  )
);

create table public.seo (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  title text not null default '',
  description text not null default '',
  updated_at timestamptz not null default now(),
  -- Full percent-decoding and canonicalization remain server responsibilities.
  constraint seo_path_shape check (
    left(path, 1) = '/' and position('//' in path) = 0
    and (path = '/' or right(path, 1) <> '/')
    and path !~ '[[:space:]?#*]'
    and position('[' in path) = 0 and position(']' in path) = 0
    and position(chr(92) in path) = 0
  ),
  constraint seo_content_required check (
    (path = '/' and btrim(title) <> '' and btrim(description) <> '')
    or (path <> '/' and (btrim(title) <> '' or btrim(description) <> ''))
  )
);

create index projects_order_idx on public.projects (position, id);
create index publications_order_idx on public.publications (position, id);
create index projects_screenshot_idx on public.projects (screenshot_asset_id);
create index published_projects_screenshot_idx on public.published_projects (screenshot_asset_id);
create index publications_cover_idx on public.publications (cover_asset_id);
create index published_publications_cover_idx on public.published_publications (cover_asset_id);

create function public.cms_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create function public.cms_protect_singleton()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Singleton content cannot be deleted or truncated: %', tg_table_name
    using errcode = '23514';
end;
$$;

create function public.cms_protect_seo_default()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'TRUNCATE' then
    raise exception 'SEO defaults cannot be truncated' using errcode = '23514';
  end if;
  if old.path = '/' then
    if tg_op = 'DELETE' then
      raise exception 'SEO defaults cannot be deleted' using errcode = '23514';
    end if;
    if new.path is distinct from old.path or new.id is distinct from old.id then
      raise exception 'SEO default identity cannot change' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- No access policies or client grants yet: access remains closed pending the
-- separately reviewed application-permissions work. Owners still bypass RLS.
do $$
declare
  content_table text;
begin
  foreach content_table in array array[
    'media_assets', 'hero_content', 'about_content', 'social_content',
    'projects', 'published_projects', 'publications', 'published_publications', 'seo'
  ] loop
    execute format('alter table public.%I enable row level security', content_table);
  end loop;

  foreach content_table in array array[
    'hero_content', 'about_content', 'social_content', 'projects',
    'published_projects', 'publications', 'published_publications', 'seo'
  ] loop
    execute format(
      'create trigger touch_updated_at before update on public.%I
       for each row execute function public.cms_touch_updated_at()', content_table);
  end loop;

  foreach content_table in array array['hero_content', 'about_content', 'social_content'] loop
    execute format(
      'create trigger protect_singleton_delete before delete on public.%I
       for each row execute function public.cms_protect_singleton()', content_table);
    execute format(
      'create trigger protect_singleton_truncate before truncate on public.%I
       for each statement execute function public.cms_protect_singleton()', content_table);
  end loop;
end;
$$;

create trigger protect_seo_default before update or delete on public.seo
  for each row execute function public.cms_protect_seo_default();
create trigger protect_seo_truncate before truncate on public.seo
  for each statement execute function public.cms_protect_seo_default();

revoke all on function public.cms_touch_updated_at() from public;
revoke all on function public.cms_protect_singleton() from public;
revoke all on function public.cms_protect_seo_default() from public;
