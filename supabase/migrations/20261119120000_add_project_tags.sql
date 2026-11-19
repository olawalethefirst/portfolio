-- Projects gain the same comma-separated tag input as publications. Existing
-- rows start with no tags; server validation enforces the count and length
-- budgets and parses the text (src/cms/publications.ts publicationTags).
alter table public.projects
  add column tags_text text not null default '';

alter table public.published_projects
  add column tags_text text not null default '';
