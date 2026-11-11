# Agreed application API decisions

This document records decisions explicitly established with the owner. It does
not select additional database tables, triggers, revision protocols, retry
ledgers, upload-reference signing schemes or numeric limits.

## Endpoint inventory

| Methods | Route | Consumer |
|---|---|---|
| POST | /api/auth/github | Continue with GitHub |
| GET | /api/auth/callback | Complete Supabase sign-in redirect |
| GET, PUT | /api/admin/hero | Hero editor read/save |
| GET, PUT | /api/admin/about | About editor read/save |
| GET, PUT | /api/admin/social | Contact/social editor read/save |
| GET, POST | /api/admin/seo | List all SEO records/create override |
| GET, PUT, DELETE | /api/admin/seo/:id | Read/update record; delete overrides only |
| GET, POST | /api/admin/projects | List/create project |
| GET, PUT, DELETE | /api/admin/projects/:id | Read/save draft/delete |
| PUT, DELETE | /api/admin/projects/:id/published | Publish/unpublish |
| PUT | /api/admin/projects/order | Persist ordering |
| GET, POST | /api/admin/publications | List/create publication |
| GET, PUT, DELETE | /api/admin/publications/:id | Read/save draft/delete |
| PUT, DELETE | /api/admin/publications/:id/published | Publish/unpublish |
| PUT | /api/admin/publications/order | Persist ordering |
| POST | /api/admin/media/uploads | Authorize direct Supabase SDK upload |
| GET | /media/:assetId | Open persisted canonical image reference |

17 route patterns / 31 method-route operations. No session-discovery, logout,
upload completion/status/renewal, standalone media-resolution, separate default
SEO or public JSON endpoints are included. Every additional route needs a named
app consumer and an explicit scope decision. Public server pages call server
query services directly. Complete list reads support current client-side search,
filtering, ordering and section previews; pagination is not selected.

## Content lifecycle and identity

The server generates persistent UUIDs, including content IDs and asset IDs.
Browser working drafts use temporary local keys. POST creates a record; PUT
updates an existing record. New resumes unsaved local work instead of clearing
it. Collection lists show remotely saved records only. First successful creation
associates/rekeys local work with the returned server ID without losing edits
made during the request. Creation-retry recovery has not been designed yet.

Project/publication detail responses expose draft and nullable published
snapshots, hiding the existing separate SQL tables. Save accepts unfinished
content with useful structural/date/reference validation. Publish validates all
applicable required fields and returns field-specific feedback; the UI focuses
the first invalid field or Article action for missing article content.

Save and Publish share backend persistence. Publish can submit current unsaved
editor input: validate, persist the captured draft and promote it in one database
transaction. An invalid Publish must not partially alter saved/live content.
Collection POST supports first-Publish intent, returning the server-created ID.
Unpublish preserves saved and local drafts. Content deletion retains media;
physical cleanup is deferred.

Publications are internal articles only. Do not track kind/externalUrl in the
model, forms, API or SQL schema. Article body is required for Publish, not draft
Save. Legacy browser draft restoration retains article text and strips obsolete
fields. The current public prototype uses /publication-details-lab; the production
article route needs a separate explicit decision before publication integration.

SEO default and overrides share endpoints/table. The default record is identified
by path /; it cannot be deleted or have its path changed, and requires title plus
description. Overrides require at least one, with blank fields inheriting the
default. POST creates overrides, not another default. Hero/About/social have
explicit Save only, without separate publishing operations.

## Media

Use public Supabase Storage in the existing project, including draft images.
Confirmed settings: media bucket, JPEG/PNG/WebP, up to 10 MiB. Use Supabase SDK
signed upload permissions; browser sends bytes directly to storage. Server owns
object keys. Keep keys unique, avoid overwrites and use long caching; an exact
cache duration has not been selected. No S3 region/endpoint or separate Supabase
URL-signing key is required by this SDK flow.

Register and associate new assets when content is remotely saved/published.
The shared persistence service calls info(path) concurrently for newly referenced
uploads, obtaining metadata/existence without downloading image bytes. Existing
registered assets use database references. Exact concurrency/timeouts, metadata
fields and upload-reference validation representation need explicit design before
implementation; no token/ledger or server image decoding is selected.

Unsaved browser drafts retain what is needed to preview their uploads before
registration. Markdown uses /media/:assetId. Shared internal resolution supplies
the actual public URL to Next.js Image on Vercel. Content reads can include image
metadata without a separate resolution endpoint. CMS Preview exposes Open original
and Copy image URL; raw Markdown remains canonical. Manually entered external
HTTPS image links remain supported; this does not allow external publications.

Upload failure shows inline feedback with Retry and preserves current edits.
Cleanup/deletion/background lifecycle work remains deferred. No extra image
provider or paid Supabase transformations are selected.

## Client and server boundaries

TanStack Query owns browser request lifecycle, server-state cache, mutations and
invalidation over a typed fetch client. Local working drafts, recovery and
reconciliation stay separate; query refreshes cannot overwrite newer editor
input. Existing providers may be replaced by resource hooks, retaining thin
context where form and writer share one editing session. Public server rendering
does not require TanStack Query or calls to the app's own HTTP endpoints.

Use Supabase Auth with GitHub; configure provider credentials in Supabase. Verify
configured-owner authorization server-side; successful provider login alone does
not grant admin access. ADMIN_USER_ID setup remains pending. Current server
configuration names are DATABASE_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY,
SUPABASE_SECRET_API_KEY and SUPABASE_STORAGE_BUCKET. No secret is public.

Drizzle is the selected application query layer; Supabase CLI owns SQL migrations.
Database Data API remains disabled. Only the original unapplied content migration
(updated for internal-only articles) and the insert-only seed are prepared SQL.
The seed initializes current dummy Hero/About/social/default SEO and preserves
existing rows; collections/media/overrides start empty. No application permissions
or hosted schema changes have been executed.

Detailed request/error schemas, concurrent-write/retry mechanisms, additional
metadata columns and cache policies are still design work. Their need and scope
must be reviewed before code or new migrations are introduced. Entity delivery
includes endpoint implementation, app integration, human testing and explicit
acceptance/proceed authorization; local tracker owns status and handoffs.
