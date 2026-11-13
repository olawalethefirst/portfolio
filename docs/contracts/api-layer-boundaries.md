# API layer boundaries

## Ownership

- Endpoints (`app/api/**/route.ts`) own HTTP parsing, transport validation,
  request-origin checks, invoking authorization/services, HTTP status selection,
  headers, cookies and redirects. They use shared response helpers.
- Services (`src/<domain>/`) own application operations, business validation,
  Save/Publish orchestration and transaction boundaries. They do not construct
  NextResponse objects or depend on route-handler request objects.
- Database access (`src/db/` domain modules) owns Drizzle mappings, queries and
  persistence operations. Pass a transaction executor when an operation participates
  in a service-owned transaction; repositories must not commit partial lifecycle
  changes independently. No HTTP parsing, redirects or UI feedback here.
- External-provider adapters own Supabase SDK and cookie/storage integration.
  Authentication does not need a content database repository merely to start OAuth.

Keep one responsibility per implementation scope. Where a capability requires
multiple layers, deliver DB access, service logic and endpoint wiring as separate
reviewable subitems with explicit dependencies. Mark unused layers not applicable;
do not add empty wrappers, interfaces or repositories to satisfy a folder pattern.
Tests belong at the lowest boundary that proves the contract, with endpoint tests
protecting actual status/header/cookie serialization and integration behavior.

## Shared utilities

Define application-wide contracts/utilities in a canonical reusable module,
for example `src/api/` for shared error codes, envelope types, JSON Pointer issue
types and HTTP response construction. Every applicable endpoint imports that
module; do not reproduce shared envelopes or generic response helpers inside
individual route files. Shared means module-level reuse, not globalThis state.

Domain-specific helpers remain in their domain; reuse the canonical implementation
there. The auth cookie adapter and return-path policy stay under `src/auth/`.
Do not move business logic into a generic utils file. A local helper used only by
one operation need not become global unless it implements an application-wide
contract. Shared utilities need a named consumer, not speculative scaffolding.

`src/auth/session-response.ts` owns `applySessionResponse(session, response)` for
transferring SDK session writes to a separately chosen outgoing response. It
copies session headers except raw `Set-Cookie`, then merges cookies through
Next.js's cookie API so options/deletions and the destination's cookies survive.
The destination keeps its status, body and other headers. Supply the SDK session
response, never incoming request headers. Proxy and the admin API wrapper reuse
it; cookie/header transfer is tested at this utility boundary. Proxy separately
owns updating request cookies for downstream rendering; callers still own
authorization and response selection.

HTTP response helpers live at the transport boundary. Services may share typed
application errors/results, but do not construct HTTP responses. The endpoint
maps those results to the approved HTTP contract using the shared helpers.
Client form adapters continue to own request-pointer-to-control mapping and focus.

This separation changes no endpoint inventory, success/error wire format,
authorization rules or persistence mechanisms. It does not authorize new grants,
provider calls, endpoint implementation or hosted operations by itself.

## Shared request checks

`src/api/request.ts` provides `withSameOrigin(handler)` and
`withContentType(expected, handler, message?)`. They preserve the request type,
route context and downstream response, terminating before invoking the handler
when their check fails. `RequestHandler` is the shared synchronous/asynchronous
handler contract; the low-level predicates are private implementation details.

Browser mutation routes opt into `withSameOrigin`: missing, opaque or mismatched
Origin receives the canonical 403 response. Do not wrap ordinary GET reads or
cross-origin OAuth callback navigation indiscriminately.

`withContentType` compares media types case-insensitively, ignoring parameters
such as charset, and returns canonical 400/INVALID_REQUEST on mismatch. Its
optional message preserves route-specific safe feedback. Body parsing and
resource-field validation remain inside the endpoint handler.

`withAdminApi(handler)` also follows the handler-wrapper contract, invoking the
operation only after owner authorization and applying session writes to its final
response. Hero PUT composes origin → owner authorization → content type → body
validation/save, preserving the original rejection order. GitHub initiation
composes origin → form content type → initiation. GET Hero wraps authorization
only. These wrappers do not substitute for service-owned business rules.
