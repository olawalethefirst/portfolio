# Media upload permission API

Status: owner-approved contract for 07.01, implemented; controller verification pending.
Scope authority: [API foundation](../contracts/app-api-foundation.md#media).

## Objective and boundary

POST /api/admin/media/uploads issues one Supabase signed upload permission to the
signed-in owner. The browser subsequently sends file bytes directly to Storage.
This operation does not upload bytes, register media_assets rows, associate content,
change hosted configuration, or implement the picker or Retry UI.

Reuse same-origin, owner-session and JSON guards in that order. Preserve refreshed
session cookies/headers and private, no-store responses through existing wrappers.
Do not change authentication, CORS or storage policies in this slice.

## Request and response

Strict JSON request:

```json
{ "contentType": "image/jpeg", "size": 123456 }
```

Accept image/jpeg, image/png or image/webp, with an integer byte size from 1 through
10485760 inclusive. Missing/wrong-type/unknown properties or malformed JSON produce
400 INVALID_REQUEST. Unsupported types or out-of-range integer sizes produce
422 VALIDATION_ERROR with JSON Pointer issues /contentType and/or /size.

The server generates a UUID asset ID and object key <uuid>.<jpg|png|webp>, choosing
the extension from the validated content type. Clients cannot supply IDs, buckets,
keys, filenames or overwrite options. Use the configured bucket and call
createSignedUploadUrl with upsert false. The generated ID is a future association
candidate, not evidence that a registered asset or uploaded object exists.

Successful permission issuance returns 200 and a direct resource:

```json
{
  "assetId": "server-generated-uuid",
  "bucket": "configured-media-bucket",
  "path": "server-generated-uuid.jpg",
  "token": "supabase-signed-upload-token"
}
```

The browser can later pass path and token to uploadToSignedUrl on this bucket.
No application signing token, database upload ledger or expiry contract is added.
Supabase controls signed upload token expiry. Tokens must not be logged.
No cache duration is selected here; upload cache options belong to the picker slice.

## Storage integration and trust boundaries

Use a server-only Supabase client with existing SUPABASE_URL,
SUPABASE_SECRET_API_KEY and SUPABASE_STORAGE_BUCKET names. Disable auth session
persistence and refresh for this privileged client. Construct/use it only after
owner authorization and request validation. Never send the secret API key to the
browser. Return an allowlisted response, not the raw SDK result or provider error.
SDK failures, missing configuration and invalid signing results become the existing
safe 500 INTERNAL_ERROR envelope. No automatic signing retry.

The request describes intended bytes; it cannot prove their actual type or size.
The bucket must enforce JPEG/PNG/WebP and 10 MiB limits and prevent unauthorized
unsigned writes. This endpoint does not modify those settings. Real uploaded
object metadata/existence is checked later during Save/Publish association.
No server byte download or image decoding is introduced.

## Implementation plan and verification

1. Add server-only signing service under src/media/ using the installed
   @supabase/supabase-js SDK, server-generated IDs and validated domain input.
2. Add app/api/admin/media/uploads/route.ts using the existing wrappers and Zod
   boundary conventions. Keep provider errors inside safe HTTP handling.
3. Add focused Vitest tests alongside service/route. Level 2: authorization and
   privileged signing cross a security boundary. Prove owner-only issuance,
   rejected origin/body/type/size, server-owned unique paths, no overwrite,
   safe failures, no signing for rejected requests, and retained session writes.
4. Run pnpm exec vitest run <affected test paths> --maxWorkers=2,
   pnpm exec tsc --noEmit, repository ESLint per CONSTRAINTS.md, and
   git diff --check. Performance classification: none; static review only.

Controller owns pnpm build and real Storage verification unless delegated.
Review actual bucket restrictions, issue owner permission, upload with returned
path/token, confirm public access and overwrite rejection. No live credentials,
network signing, bucket changes, builds or browser runs are part of preparation.

## References

- https://supabase.com/docs/reference/javascript/file-buckets-createsigneduploadurl
- https://supabase.com/docs/reference/javascript/file-buckets-uploadtosignedurl
- https://supabase.com/docs/guides/storage/security/access-control

Owner approved this request/response contract before implementation.
