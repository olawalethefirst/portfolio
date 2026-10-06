# Portrait hero vertical spread specification

## Objective

Keep the editorial block, Prism, and controls together on oblong portrait devices
by capping their vertical spread using the Prism's estimated home-presentation
height. Center the complete group in available hero space. The cap is proportional
to Prism height; it is not a fixed pixel height or a 0.7 aspect-ratio container.

Apply to every portrait viewport below the existing `lg` breakpoint, including
tablet portrait. Preserve existing landscape and `lg` layouts. Keep one full-
viewport Canvas independent of the content group's bounds. No fallback is authorized.

This supersedes portrait viewport-edge anchoring in the earlier responsive hero
review. The discarded ratio-based implementation is not a starting point.

## Initial factor

The owner selected spread factor `K = 1.2` for the initial implementation and
visual evaluation. It applies to the Prism allocation only, not editorial or
control heights. A change to 1.5 requires an explicit subsequent decision.

## Sizing contract

Measure the actual hero bounds and rendered editorial/control heights. Editorial
height includes the identity, heading, description, and action buttons. Keep their
existing typography, widths, maximum widths, wrapping, and control dimensions.
Do not narrow editorial or controls when the Prism becomes height-limited.

The safe available rectangle excludes responsive outer clearance: 1rem below
`sm`, 1.5rem from `sm`, increased on each edge when its safe-area inset is larger.
Use the existing 1rem clearance between editorial and Prism allocation and between
Prism allocation and controls. Apply the existing 5% horizontal framing gutter
on each side of the safe available width before estimating Prism height.

```text
A = safe available height
W = safe available width × 0.9
E = measured editorial height
C = measured controls height
G = 1rem
Q = optical bounding height / optical bounding width = 1.2 / 1.2 = 1
F = existing camera home-fit reserve = 0.9

P = W × Q × F
remainingHeight = A − E − C − 2 × G
prismAllocationHeight = min(remainingHeight, K × P)
groupHeight = E + G + prismAllocationHeight + G + C
groupTop = safeTop + (A − groupHeight) / 2
```

`P` is the width-based projected optical-envelope height at the home pose, not
the rotating silhouette and not the Prism's current zoomed size. Derive `Q` and
`F` from the existing framing contract rather than introducing unrelated constants
that could drift from camera fitting. All sizing uses CSS pixels and actual DOM
measurements.

The `min` is the cap's normal sizing rule: on tall devices the allocation stops
growing at `K × P`; on shorter portrait devices it uses the positive remaining
height. No extra behavior activates to stretch content, shrink controls, or change
the factor. Do not calculate the cap from the height-limited fitted result, which
would create a feedback dependency between the cap and camera fit.

The container uses the calculated group height, with editorial content anchored
to its top and controls anchored to its bottom. No spacer or nested group wrapper
is required. The rendered gap between those boundaries, less the two clearances,
is the Prism allocation. Center the whole
group vertically in the safe available rectangle and its children horizontally.
Extra viewport height remains outside the group. The group's height must not
grow beyond its calculated cap merely because the viewport is taller.

Example with safe width 358, safe height 812, E=180, C=100, G=16:

```text
W = 322.2; P = 289.98; remainingHeight = 500
K=1.2: allocation=347.976; groupHeight=659.976
K=1.5: allocation=434.97;  groupHeight=746.97
```

These are optical-envelope estimates, not proof of rendered content fit. The
camera still uniformly fits within the measured width and allocated height.

## Layout and camera responsibilities

Prefer a small layout change plus measurement adaptation. HTML owns the centered
container through one height variable. Apply the height before re-reading its
editorial/control bounds; derive the actual gap rather than predicting coordinates
independently of CSS. The measurement adapter normalizes that
gap rectangle against the full Canvas. The Stage continues to own camera
distance, projection, optical bounds, and orbit controls.

Do not subtract a second clearance or apply another horizontal gutter after
building the allocation. In this portrait scope, do not expand it to the existing
11rem minimum frame height or choose a side-by-side region through the 20rem
minimum-width threshold. Retain those existing rules outside this scope.

The allocation is a home-framing region, not a clipping or input boundary. Canvas
dimensions, zoom rendering area, scroll ownership, camera aspect, discovery
interpolation, desktop zoom centering, and reduced-motion handling remain intact.
Existing discovery distance continues to derive from fitted home distance; its
projected size may change when the initial available frame changes.

The cap is independent of discovery progress and orbit rotation. Zoom must not
push the editorial and controls apart. Remeasure on state-dependent text changes,
wrapping, font loading, viewport/orientation changes, and control-size changes.
Preserve discovery progress and use updated framing on recentre. Ignore unchanged
measurements and prevent ResizeObserver feedback loops.

## Failure conditions and boundaries

A non-positive remaining height, overflow, or overlap is an acceptance failure.
Report viewport dimensions, semantic state, content measurements, gaps, factor,
and calculated budget. No fallback is authorized: do not silently alter `K`,
shrink typography/controls, hide content, clip it to fit, add an internal scroller,
expand the home frame, or substitute default framing. This spec does not introduce
a runtime error interface or require deliberately crashing the page.

- Always: preserve project constraints, unrelated edits, full Canvas, optical
  proportions, layout scope, and measurable sizing/centering contracts.
- Ask first: change the factor after selection, content/control dimensions, gaps,
  zoom mapping, scope, or introduce fallback behavior.
- Never: weaken `CONSTRAINTS.md`, add suppressions, remove failing checks, or
  commit raw task evidence as durable documentation.

## Source structure and conventions

Use the existing Next.js 16, React 19, TypeScript, Tailwind 4, and Three.js stack.
No new dependency is expected. Read relevant bundled Next.js guides before code.

- `src/components/prism-fiber/ui/hero/PrismHeroLayout.tsx`: portrait group layout.
- `ui/hero/usePrismHomeFrame.ts`: DOM measurements and stable updates.
- `ui/hero/prism-home-frame-measurement.ts`: bounded portrait allocation mapping.
- `stage/prism-home-frame.ts`: authoritative optical envelope and fitting reserve.
- Colocated Vitest tests: sizing and measurement coordination.
- This document and `docs/README.md`: durable design contract.

Use existing named helpers, readonly geometry types, and normalized rectangles.
Keep Three.js objects out of UI props. Express the cap directly, for example:

```ts
const remainingHeight = availableHeight - editorialHeight - controlsHeight - 2 * gap;
const allocationHeight = Math.min(remainingHeight, spreadFactor * estimatedHomeHeight);
```

## Verification and acceptance

Automated test scope is level 2 for content/viewport/geometry coordination. Focused
tests must cover cap-active tall screens, positive height-limited screens, content
height changes, normalization against the independent Canvas, no minimum expansion
or duplicate inset, unchanged measurements, responsive transitions, and preservation
of current discovery progress. Invalid budgets must be exposed rather than repaired.
Do not test incidental class strings or claim visual fit from jsdom tests.

Controller browser review covers 320x568, 360x800, 390x844, 430x932, and 768x1024
portrait; all three semantic states; enlarged text; browser-chrome changes; and
adjacent landscape/`lg` layouts. Acceptance requires:

- Group height agrees with the sizing contract within one CSS pixel.
- Group center matches the safe available rectangle center within one CSS pixel.
- Increasing only viewport height beyond the cap adds outer space rather than
  increasing separation inside the group.
- No editorial/control overlap or overflow; the Prism allocation remains positive.
- Zoom renders beyond the allocation without changing content spread; controls
  remain keyboard-operable and no fallback is used.

Performance classification is possible: no new animation loop, per-scroll React
render, or ResizeObserver loop. Controller review must show no new repeated
scroll-linked main-thread task over 50ms or visible discontinuity.

Agent checks:

```sh
pnpm exec vitest run src/components/prism-fiber app/prism-fiber-lab
pnpm exec tsc --noEmit
git ls-files --cached --others --exclude-standard -z -- '*.js' '*.jsx' '*.mjs' '*.ts' '*.tsx' | xargs -0 pnpm exec eslint --
git diff --check
```

The human controller owns `pnpm dev`, `pnpm build`, and browser/accessibility/
performance checks unless explicitly delegated, per `CONSTRAINTS.md`.

## Implementation status

The initial factor is resolved as 1.2. Application implementation and rendered
visual evaluation remain pending; selecting the factor does not establish that
the layout has passed its fit checks.
