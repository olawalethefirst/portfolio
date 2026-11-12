# JSON API error contract

## Scope

JSON API failures identify problems in the request contract. Resource form
adapters translate them into editor feedback. Server errors never contain DOM
names, component IDs, focus targets or editor-specific flattened keys.
OAuth redirects, canonical media redirects and direct Supabase SDK failures have
separate transport behavior. This contract adds no endpoints or database changes.

## Wire format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some values are invalid.",
    "issues": [
      {
        "pointer": "/stages/idea/tagline",
        "message": "Complete this field before saving."
      }
    ]
  }
}
```

code is the stable machine discriminator. message is safe, human-readable copy;
clients must not branch on its text. issues is an optional array of request-field
problems; omit it when no field location applies. Each issue contains pointer
and message. Multiple issues may refer to the same location; the form may show
the first message for that control while retaining all issues in the error.

pointer uses the JSON Pointer string representation from RFC 6901, relative to
the complete request body: / separates segments, ~0 represents ~ and ~1 represents
/. Array indexes are zero-based. The empty string denotes the whole body. Do not
use URI-fragment # syntax, dotted paths or database column names. A missing field
can be identified by its expected location. Malformed JSON has no field issues.

The envelope is an application-specific format, not RFC 9457 Problem Details;
do not advertise application/problem+json. Responses use application/json and
a non-success HTTP status. RFC 9457's validation example informs the separation
of request locations from presentation; full adoption is not required here.

## Responsibilities

The server independently validates untrusted requests and enforces authorization,
action-specific content rules and database invariants. Client validation provides
earlier feedback and cannot replace server checks. Compatible validation rules
may be shared; UI field naming and focus rules stay client-side.

The shared fetch client preserves HTTP status, error.code, error.message and all
issues in a structured error. It validates the envelope and supplies safe general
feedback for malformed/non-JSON responses or network failures. It does not map
pointers to controls, navigate, focus or update local drafts. Keep transport
failures distinguishable from server rejection; a lost response does not prove
the mutation rolled back.

Each resource form adapter owns an explicit mapping from request pointers to
existing editor field keys. Unknown pointers, whole-body issues and issues with
no editable target become form-level feedback, never silently disappear or
become selector strings. Never interpolate server pointers into DOM selectors.
Field-error presentation may select one message per mapped field.

The editor controls feedback visibility and focus order. Apply field feedback
only to the submitted editor generation; late failures must not invalidate newer
input, move focus after navigation, or discard working drafts. Existing visual
field order determines the first invalid target, not response issue order.

## Mapping examples

| Request | Server pointer | Client field / action |
|---|---|---|
| Hero complete-content PUT | /eyebrow | eyebrow |
| Hero complete-content PUT | /stages/idea/tagline | idea-tagline |
| Hero complete-content PUT | /stages/iterate/description | iterate-description |
| About complete-content PUT | /biography | biography |
| Social complete-content PUT | /github | github |
| SEO POST / PUT | /path | path |
| Project body containing draft | /draft/screenshotAlt | screenshotAlt |
| Publication body containing draft | /draft/bodyMarkdown | bodyMarkdown; focus Article action |
| Any JSON body | empty string or unmapped pointer | Form-level feedback |

These examples follow the currently proposed request bodies. A resource must
finalize its payload before implementing its mapping: if the body changes, the
pointer must reflect the actual wire body, including any draft wrapper. All Hero
stage tagline/description combinations follow the same explicit mapping pattern.

A normalized SEO-path collision can include an issue at /path while remaining a
409 CONFLICT. Validation issues do not require every error to be a 422. HTTP
status/code choices remain in the shared request/response proposal until accepted.
No concurrency, retry or upload-reference protocol is selected here.

## Verification contract for later implementation

Focused tests should prove nested-field mapping, /draft/bodyMarkdown mapping to
Article, JSON Pointer escaping where used, safe fallback for unmapped issues,
preservation of structured errors, and stale-response protection at the owning
layer. Use the lowest layer that proves each behavior. No runtime implementation
or test results are implied by this written contract.

## References

- [RFC 6901 — JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901.html)
- [RFC 9457 — validation example](https://www.rfc-editor.org/rfc/rfc9457.html#section-3.1)

## Shared implementation

`src/api/errors.ts` owns `ApiErrorCode`, `ApiIssue`, `ApiError` and
`ApiErrorEnvelope`. `apiErrorResponse(error)` serializes the envelope as JSON,
selects the approved status for its code, and sets `Cache-Control: private,
no-store`. Use it at HTTP boundaries; services return typed application results
without constructing Responses. Pass only safe messages/issues, never raw SDK
or database error objects. The GitHub initiation route is the first consumer.
