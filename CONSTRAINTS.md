# Project Constraints

Last reviewed: 2026-09-14 by the project owner

## Floor

- Do not add suppression comments such as `@ts-ignore` or `eslint-disable` to make a change pass.
- Do not add unfinished stubs, empty error handlers, skipped tests, or delete tests without explicit justification.
- Do not commit secrets, credentials, environment files, local task evidence, or generated build output.
- Do not weaken this file in the same change that fails one of its constraints.
- Preserve unrelated user changes and inspect exact paths before staging or committing.

## Enforced Checks

| Dimension | Rule | Checked by | Runs at |
|---|---|---|---|
| Types | Zero TypeScript errors | `pnpm exec tsc --noEmit` | Task end |
| Lint | Zero ESLint errors in tracked and non-ignored untracked JS/TS source | `git ls-files --cached --others --exclude-standard -z -- '*.js' '*.jsx' '*.mjs' '*.ts' '*.tsx' \| xargs -0 pnpm exec eslint --` | Task end |
| Build | An affected application build succeeds | Controller runs `pnpm build`, or explicitly delegates it | Human-controller review for code/config changes |
| Accessibility | Affected UI is keyboard-operable, semantically named, and has no serious accessibility defect | Controller performs browser inspection and keyboard testing, or explicitly delegates it | Human-controller review for UI changes |

## Conditional Checks

Performance is classified during scoping:

- `none`: static review for obvious regressions only.
- `possible`: define a measurable non-regression criterion for the controller to verify before acceptance.
- `explicit`: the controller records before/after measurements and blocks acceptance when the approved target is missed.

Agents may run types, lint, and focused non-browser tests. They do not run production builds, start application servers, or perform browser/accessibility/performance verification unless the human controller explicitly delegates that action.

## Automated Test Scope

Automated tests protect important user-experience behavior that is difficult to
verify reliably through ordinary visual review. A test must provide durable
insight into the experience it protects; adding a test merely because a file
changed is not a quality goal.

Classify changed behavior before deciding whether an automated test is needed:

| Level | Requirement | Use when |
|---|---|---|
| 0 — Visual review | No automated test is expected | The change is cosmetic, static, low-impact, or readily verified through normal visual review. |
| 1 — Author judgment | Add a test only when it captures durable behavioral insight; record the reasoning in the review handoff | The change has some hidden state or regression risk, but limited user impact or straightforward manual verification. |
| 2 — Required | Add or update the smallest focused automated test that protects the experience | An important experience depends on a unique or difficult-to-reproduce state, branching, timing, recovery behavior, input handling, or coordination across components. |

Tests must assert observable outcomes or an explicit user-facing contract.
Accessible roles and names, required status messages, and user-visible state
changes are valid assertions. Incidental class names, styling, static copy, DOM
structure, component internals, and other implementation details are not valid
targets unless they are themselves part of an explicit experience contract.

Prefer the lowest test layer that can prove the contract without coupling the
test to implementation. Tests do not replace visual review for styling, layout,
animation polish, or ordinary content changes.

Do not invent a coverage target until the repository has a measured baseline.
Coverage may inform review, but it does not determine whether a test is valuable
or required; the scope classification above does.

## Exceptions

Every exception must state the rule, affected path, reason, owner, and expiry date. An exception requires explicit human approval and must not silently become the default.
