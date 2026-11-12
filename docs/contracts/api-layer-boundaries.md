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

HTTP response helpers live at the transport boundary. Services may share typed
application errors/results, but do not construct HTTP responses. The endpoint
maps those results to the approved HTTP contract using the shared helpers.
Client form adapters continue to own request-pointer-to-control mapping and focus.

This separation changes no endpoint inventory, success/error wire format,
authorization rules or persistence mechanisms. It does not authorize new grants,
provider calls, endpoint implementation or hosted operations by itself.

## Shared request checks

`src/api/request.ts` provides `checkSameOrigin(request)` and
`hasContentType(request, expected)`. Browser mutation routes call the former
before parsing input or invoking services; it returns null on a matching Origin
or the canonical 403 response otherwise. Missing/opaque Origin is denied. This
is explicit route-level enforcement, not Proxy-based authorization, and must not
be applied indiscriminately to GET reads or cross-origin OAuth callback navigation.

`hasContentType` compares the media type case-insensitively, ignoring parameters
such as charset. The route selects the expected media type and uses the shared
error response helper on mismatch. Body parsing and resource-specific field
validation remain at the endpoint boundary. Neither utility grants owner access,
validates body content or substitutes for the service's business rules.
