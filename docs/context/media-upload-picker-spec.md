# Image upload hook — 07.02

Scope corrected by owner: expose a simple upload hook that pairs with the existing
ImagePicker. This supersedes the earlier Project-specific picker proposal.
Dependency: [upload permission API](media-upload-api.md).

## Contract

useImageUpload(config) wraps one useMutation. React Query owns isPending, error,
data and variables (the File used for explicit Retry). No parallel busy/error/File
state, generation counters or callback refs are added for uploads.

The mutation validates JPEG/PNG/WebP, 1 byte through 10 MiB, requests permission, then sends bytes directly through Supabase uploadToSignedUrl.
Every explicit attempt obtains a fresh path; retry is false. SDK options use
contentType, upsert false and cacheControl "31536000" for unique immutable keys.
Return the public source and assetId/bucket/path reference. Do not persist tokens.

ImagePicker exposes onFileSelect, isPending and onRetry for composition. Selection
routes to the supplied callback; controls use the supplied pending flag. Existing
local selection remains available to current consumers. Errors use its existing
error prop. Retry uses a leading decorative RotateCw icon; the native file input
and ghost Remove button retain their existing icon-free presentation.

## Pairing

Use within the existing CMS QueryClientProvider:

```tsx
const upload = useImageUpload(config);
const select = (file: File) => upload.mutate(file, {
  onSuccess: (image) => onChange(image.source),
});

<ImagePicker
  value={value}
  alt={alt}
  onChange={onChange}
  onFileSelect={select}
  isPending={upload.isPending}
  error={upload.error?.message}
  onRetry={upload.isError && upload.variables
    ? () => select(upload.variables!)
    : undefined}
/>
```

Per-call mutate callbacks update the field only after success and do not run after
unmount. The previous field value remains on failure. A caller can use the returned
reference when its persistence API is implemented. Publishable URL/key configuration
is supplied by the caller; secret keys stay server-only.

No second picker, Project schemas, editor-wide pending state, route configuration,
draft storage or content API integration belongs to this slice. Current production
fields are not switched to uploads here. Consumer integration is separate work.

## Verification

Level 2 focused tests cover validation, safe failures, no automatic retry, mutation
state/explicit Retry, unmount behavior, and pairing with the existing field. Run
pnpm exec vitest run src/media src/components/cms/ImagePicker.test.tsx --maxWorkers=2,
pnpm exec tsc --noEmit, repository ESLint per CONSTRAINTS.md and git diff --check.
Performance none. Controller owns builds/browser/live Storage verification unless
delegated. This slice does not claim completed browser or real upload checks.

## Sources

- https://supabase.com/docs/reference/javascript/file-buckets-uploadtosignedurl
- https://tanstack.com/query/latest/docs/framework/react/guides/mutations
