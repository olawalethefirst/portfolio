# Admin login UI specification

## Provider decision — 2026-11-11

The owner has selected **GitHub through Supabase Auth**, replacing the original
Google-only plan below. The existing implementation still shows Google; this
document update does not change runtime code. The original Google copy, artwork,
branding and account-selection requirements below describe the earlier UI and
are superseded for future authentication integration.

The integration must show **Continue with GitHub**, with a leading decorative
GitHub mark (preferred over generic LogIn; reuse the existing licensed local mark
where suitable). Preserve the standalone layout, Back action, async states and
vendor-independent view boundary. Implement only GitHub, not an additional Google
option. Provider-specific account-switch recovery must be verified with GitHub.

Application routes are `POST /api/auth/github` and `GET /api/auth/callback`.
Register a GitHub OAuth App using the callback copied from Supabase provider
settings, normally `https://<project-ref>.supabase.co/auth/v1/callback`. Configure
the GitHub client credentials in Supabase and allow local/production application
callback URLs in Supabase redirect settings. These are distinct callback hops.

Only the configured owner's verified Supabase user UUID (`ADMIN_USER_ID`,
server-side) authorizes CMS access. Missing configuration denies access; successful
GitHub authentication alone grants no CMS privileges. Existing production gate
and account-scoped browser-draft requirements still apply.

References: [Supabase GitHub sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-github),
[GitHub OAuth registration](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app).

## Original UI specification and implementation record

Status: approved; UI implemented. This specifies the UI; it does not authorize live
Google/Supabase configuration or authentication implementation.

## Objective and scope

Give the portfolio owner a simple admin entry at `/admin/login`, using the
existing Next.js, React, HeroUI, and theme system. Google is the only sign-in
provider; Supabase Auth is the intended service, isolated behind the application's
authentication boundary. Application database and storage remain independent.

This change covers the standalone page, its presentation states, and separating
it from the CMS navigation layout. Real sign-in, sessions, authorization, and
unauthenticated redirects remain future authentication integration work.

## Layout and copy

Use a full-height page with a compact, horizontally and vertically centered
content stack, approximately 400 px maximum width and mobile-safe padding.
Reuse existing typography, spacing, colors, focus treatment, and light/dark
modes. Use the plain page background; no enclosing card, illustration, or
additional decorative section is necessary.

The default content is exactly:

1. Heading: **Content Studio**.
2. Full-width primary sign-in action: **Continue with Google**.
3. Secondary navigation: **Back to portfolio**, linking to `/`.

No portfolio/name mark, subtitle, access-restriction sentence, email/password
fields, registration, additional providers, or automatic One Tap prompt.
Conditional feedback may appear below the primary action.

### Icon decisions

| Control | Candidates | Decision |
| --- | --- | --- |
| Continue with Google | Official Google G; generic LogIn or UserRound | Official Google G, leading and decorative; identifies the selected provider. Follow Google's current branding rules before shipping. |
| Back to portfolio | Text only; ArrowLeft | ArrowLeft, leading and decorative; justified directional cue for secondary ghost-style navigation. |

Reuse the existing `Button` wrapper for actions and its link form for Back.
Provider branding may require a button-specific appearance override; do not
change shared button styles globally.

## UI behavior and integration boundary

Keep one small login view under `src/components/cms/`; receive sign-in behavior
through a callback and presentation state rather than importing the Supabase SDK
into the view. Use existing state patterns, not a generic authentication framework.

- Ready: Google action is enabled when a real sign-in action is supplied.
- Pending: show the existing button spinner and a “Signing in…” live status, and prevent
  duplicate activation. Keep Back available.
- Failure: show an accessible inline error; allow retry through the same button.
- Access denied: show “This account doesn’t have admin access.” Signing in again
  must permit selecting another Google account when authentication is integrated.
- Unavailable: if authentication is not connected, keep the Google action disabled
  without an availability message. Do not simulate a successful login,
  fabricate a session, or navigate into the CMS on button activation.

Errors belong below the primary action, use an alert role, and are absent in the
normal ready state. Preserve visible button labels and keyboard focus indication.
Do not use the local draft store for credentials, tokens, or login state.

## Routing and project structure

`app/admin/login/page.tsx` composes the standalone login view. Keep metadata
non-indexable and title it “Content Studio”.

The current `app/admin/layout.tsx` wraps all children with CMS providers and
`CmsShell`. Move that editor-specific composition into a route-group layout,
such as `app/admin/(studio)/layout.tsx`, and place the existing studio pages under
that group without changing their URLs. The login route stays outside that group.
Keep the existing environment gate at the common admin boundary, including its
production behavior. Do not replace it with a client-side pretend login gate.
Existing `/admin` navigation continues to work as before until real auth lands.

Colocate focused tests beside the login view and affected route layouts. Before
implementation, read the installed guides under `node_modules/next/dist/docs/`
for route groups, layouts, and client/server component boundaries.

Follow the existing TypeScript and component conventions. For example, use the
existing loading prop rather than implementing another spinner:

```tsx
<Button isLoading={pending} isDisabled={unavailable} onPress={onSignIn}>
  Continue with Google
</Button>
```

This illustrates composition only; final props must preserve Google branding
and prevent repeated activation while pending.

## Deferred authentication contract

At authentication integration, connect the action through the backend's auth
boundary to Supabase Auth with Google. Keep vendor-specific code out of the login
view and CMS forms. Validate the authenticated identity server-side and authorize
only the configured admin identity; successful Google login alone grants no CMS
access. Protect server data operations as well as page access.

Define callback/session handling and safe same-origin return destinations during
that integration. Successful authorized login should return to the originally
requested admin page, defaulting to `/admin`. Account selection and access-denied
recovery must be tested with the real provider. Do not provision the first person
who signs in as an admin.

Account-scoped local drafts must be addressed before authenticated multi-account
use; see [CMS local drafts](cms-local-drafts.md). No authentication dependency or
service setup is required for this UI-only change.

## Acceptance and verification

- Login renders the agreed three-element layout without CMS navigation/providers.
- Existing admin routes, previews, and environment-gate behavior remain intact.
- Pending, retry, denied, and unavailable states follow the contract above.
- No disconnected sign-in action implies successful authentication.
- Back navigates to `/` and remains keyboard accessible in every state.
- Mobile widths and both themes have readable contrast and no horizontal overflow.

Testing classification: static layout is Level 0; async interaction and route/gate
coordination are Level 2. Use Vitest and Testing Library to verify duplicate-click
prevention, error/retry and unavailable behavior, and layout/gate isolation. Tests
may inject callbacks to exercise presentation states; this does not authorize a
runtime mock authentication flow. Avoid tests of incidental styles or DOM shape.
Performance classification: none; inspect for obvious regressions and keep auth
scripts and SDKs out of this UI-only change.

Implementation checks:

```sh
pnpm exec vitest run src/components/cms/AdminLogin.test.tsx app/admin
pnpm exec tsc --noEmit
git ls-files --cached --others --exclude-standard -z -- '*.js' '*.jsx' '*.mjs' '*.ts' '*.tsx' | xargs -0 pnpm exec eslint --
```

The test path assumes the view is named `AdminLogin`; adjust it if naming changes.
The controller runs `pnpm build` and browser/keyboard/theme checks, or explicitly
delegates them, per CONSTRAINTS.md.

Always preserve project constraints and reuse existing components. Ask before
expanding to live authentication, service configuration, or new dependencies.
Never weaken checks, persist credentials in local drafts, add an authentication
bypass, or silently enable the production CMS.

## Implementation notes

Existing studio routes now live under `app/admin/(studio)/` with unchanged URLs.
`app/admin/layout.tsx` retains metadata and the environment gate; only the studio
layout mounts editor providers and navigation. `/admin/login` renders the
disabled sign-in state without an availability message until a real sign-in
callback is connected.

`AdminLogin` accepts `onSignIn` and `accessDenied`. It manages only request
presentation and duplicate-activation prevention, with a generic retry error;
it never displays raw provider errors or decides authorization. Tests inject
callbacks without introducing a runtime authentication mock.

The Google mark uses Google's official 40 px PNG icon-mode artwork, displayed
through a 20 px CSS viewport at native resolution to show only its logo. The
button retains a white surface in both application modes. No auth script, SDK,
external image request, or font request is introduced. Recheck current provider
branding (including the Google Sans font) before live authentication release.
Artwork source: [Google sign-in assets](https://developers.google.com/static/identity/images/signin-assets.zip)
and [branding guidelines](https://developers.google.com/identity/branding-guidelines).

No open layout questions. Live authentication remains explicitly deferred.

## Supabase server cookie adapter

`src/auth/server.ts` exposes `createSupabaseServerClient(requestCookies, response)`
for writable server request contexts. It creates a fresh Supabase SSR client on
every call; never cache it globally or share it across requests. Configuration is
read on invocation from `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, with no
secret/service-role fallback and no `NEXT_PUBLIC_` aliases. Installed Supabase
SDK versions require Node.js 22 or later; verify the deployed runtime accordingly.

The caller supplies the incoming cookie store and the actual outgoing response
(or equivalent writable cookie/header sinks). `NextRequest.cookies` and
`NextResponse` satisfy these interfaces. With `cookies()` from `next/headers`,
await it first, per the installed Next.js guide. The adapter reads all request
cookies and forwards every SDK cookie chunk/deletion with its options, plus the
SDK's cache-prevention headers, to the supplied response. Return that response;
if replacing it, preserve all cookies and cache headers. Write failures propagate.

This writable adapter is not for Server Component rendering, where cookie writes
are forbidden. Read-only server rendering and proxy refresh integration are
separately scoped. Do not suppress cookie write errors to make it work there.
The adapter itself does not refresh a session, authorize a user, initiate OAuth,
query content, or expose an endpoint. Session/owner verification and integration
must be implemented in their separately accepted slices.

References: [Supabase SSR client guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
installed `@supabase/ssr` cookie types (including response cache headers), and
`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`.

## Admin return destination policy

`src/auth/return-path.ts` exports `adminReturnPath(value)`. After successful
sign-in, preserve the originating destination only when it is a root-relative
`/admin` path (the `/admin` segment must match exactly) and is not `/admin/login`
or a descendant. Missing or rejected values fall back to `/admin`.

The helper resolves the query-decoded return value with `new URL` against a
fixed placeholder origin (`baseOrigin`); no network request is made to it.
It checks the resolved origin and decoded admin/login pathname, treating repeated
slashes/backslashes as separators for comparison. Invalid URLs or malformed
pathname escapes fall back to `/admin`. Relative spellings, whitespace and dot
segments follow URL parser normalization. Query strings/fragments survive.
Unknown admin paths and nested encodings are not separately filtered; they may
produce a normal 404. The helper is not an existing-route allowlist.

Pass the returned root-relative value unchanged to the eventual redirect; never
URL-decode it again. Revalidate untrusted return values at OAuth initiation and
callback boundaries rather than trusting a previously supplied query parameter.
Use the application's trusted origin if an absolute redirect URL is required.
The helper alone performs no redirects, authentication, authorization or navigation;
endpoint integration remains separately scoped. Browser fragments are only
preserved when supplied by a client; they are not present in incoming HTTP URLs.

## GitHub sign-in initiation endpoint

`POST /api/auth/github` accepts a browser form with content type
`application/x-www-form-urlencoded` and one optional `returnTo` string field.
An empty form uses `/admin`; unknown fields and duplicate returnTo values are
rejected with 400. The existing return-path helper validates the destination.
JSON bodies are not supported by this navigation endpoint.

The Origin header must exactly match the request URL's origin; missing, opaque
or cross-origin values receive 403 before OAuth is started. Hosting must supply
Next.js with the correct application URL/origin. The handler does not trust a
client-supplied callback origin or arbitrary forwarded headers.

The handler constructs `/api/auth/callback?returnTo=...` on the request origin
and calls the request-local Supabase client's `signInWithOAuth` with GitHub and
`skipBrowserRedirect: true`. Success returns 303 to the SDK authorization URL,
using the same response that received the PKCE verifier cookie and SDK cache
headers. All responses are private/no-store. Configure this application's callback
URL in Supabase's redirect allowlist before real-provider verification.

Invalid input/origin, unavailable configuration and provider initiation failures
return safe JSON errors using the shared envelope; status/code pairs are
400/INVALID_REQUEST, 403/FORBIDDEN, 500/INTERNAL_ERROR and
503/SERVICE_UNAVAILABLE. Provider errors, thrown failures and missing provider
URLs cannot produce a success redirect; raw error details are not exposed.
No credentials are read from the request, and successful OAuth initiation grants
no owner access.

This endpoint starts OAuth only. Callback exchange, owner authorization, session
refresh, login UI wiring and integrated real-provider verification are separate
slices. No rate-limiting service is configured here; deployment abuse controls
remain a launch consideration. The original production UI gate is unchanged.

### Initiation layer ownership

`src/auth/github-service.ts` exports `startGitHubSignIn(auth, origin, returnTo)`.
It accepts the provider's signInWithOAuth capability as a dependency, builds the
callback using the validated return-path policy, and returns either an authorization
URL or a safe typed application error. It has no NextRequest/NextResponse, cookie
sink, environment access or content repository dependency.

The route owns form/origin validation, construction of the cookie-enabled client,
and the final 303 response. It passes the request origin to the service and uses
`src/api/errors.ts` for every JSON error. Existing statuses, returnTo handling and
PKCE cookie/cache-header preservation remain the same.
