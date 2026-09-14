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

Do not invent a coverage target until this repository has a real test runner and measured baseline. New behavioral work must still introduce the smallest appropriate test setup or explicitly obtain approval for another repeatable verification method.

## Exceptions

Every exception must state the rule, affected path, reason, owner, and expiry date. An exception requires explicit human approval and must not silently become the default.
