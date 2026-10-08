# Prism Scroll-Zoom and Glass Overlay Lab Specification

Status: Implemented on 2026-10-06; remaining review closed by owner direction on 2026-10-07 (no additional browser verification recorded).

## Project-content amendment

The foreground glass Surface now contains the shared `project-item-lab`
projects, Field Notes followed by Relay. This supersedes the empty,
decorative-panel requirements below: the Surface is content-bearing, permits
pointer input, is exposed to assistive technology, and grows with its project
stack instead of being fixed to one viewport. Each project retains its solid
`bg-surface` background and sticky top-aligned layout. The destination retains
the global HTML theme. Route-specific theme defaults have been superseded by
[global theme ownership](global-theme-and-prism-appearance.md).

The native discovery runway and camera-progress mapping remain unchanged.
Project previews add their existing device Canvases alongside the persistent
hero Prism Canvas. Human review should check sticky stacking, accessible live
links, and scroll performance with all three renderers present. No nested
scroll container or additional glass-filter owner is introduced.

Navigation placement belongs to consumers: `NavigationPanel` keeps only local
relative positioning to anchor its expanded card above the launcher. Existing
lab/showcase consumers supply fixed bottom wrappers. The Prism glass content
places the shell-controlled navigation through a `LabThemeShell` children
render function: an overlapping grid lane
reserves the first viewport minus the 0.5rem bottom inset, followed by a
zero-height sticky anchor at that same viewport position. Its bottom-aligned
navigation rises with the glass, then remains at the viewport bottom while
projects scroll. Geometry does not assume a launcher height and uses no
JavaScript scroll animation. Reverse scrolling restores the entrance.
The shell wraps the complete lab and consumes global theme/mode settings for the
hero, glass and projects together; it retains local font-scale control. No
nested hardcoded theme overrides remain.
The route main uses `bg-surface` to match the solid project backgrounds; the
Three.js scene adapts backing tint and figure lighting to the global mode;
other materials and lighting retain their authored appearance.
Browser review must cover viewport/font changes,
expanded-card stacking and focus, and the forward/reverse sticky geometry.

The remaining sections describe the original empty-panel prototype wherever
they conflict with this amendment.

Desktop projection amendment: [Desktop Prism zoom centering](prism-desktop-zoom-centering-spec.md)
supersedes this document's distance-only and fixed-view-offset requirements on
the desktop two-column layout. Horizontal offset reaches zero at discovery
progress 1. Mobile retains the distance-only contract; other requirements remain.

## Objective

Modify the existing `/prism-fiber-lab` route to demonstrate the smallest
useful version of the Prism discovery transition around the complete existing
hero:

1. native document scrolling drives only the Prism camera zoom;
2. the zoom completes across the first `100dvh` of scroll travel;
3. an empty glass panel then rises over the pinned Prism through normal
   document flow; and
4. reversing the page scroll reverses the camera zoom and panel movement.

The lab exists to validate the spatial model and zoom pacing before hero
content, application content, navigation, ambient rendering, or the complete
handoff behavior is introduced.

## User experience

### Initial state

- The route opens on the complete existing `PrismHeroLayout`, including its
  editorial content, CTAs, semantic-state controls, and one Prism Canvas.
- The hero layout, autoplay, state selection, responsive home frame, and direct
  rotation behavior remain unchanged.
- The Prism uses its responsive fitted home view, reserving 10% of the
  measured frame so its projected bounds occupy at most 90% of the available
  width and height, and retains its current semantic initial state.
- The document, rather than the Canvas or a nested region, owns scrolling.

### Forward sequence

The demonstration has two consecutive one-viewport phases:

| Page-scroll interval | Camera | Glass panel |
|---|---|---|
| `0–100dvh` | Interpolates from the fitted home distance to one fixed discovery distance | Remains below the viewport |
| `100–200dvh` | Holds the discovery distance | Rises from below the viewport until it covers the viewport |

The first interval changes only camera distance. It does not change Prism
rotation, semantic state, opacity, lighting, saturation, hero content, or
interaction state.

The glass panel is not translated by JavaScript. Its entrance must result from
normal document flow passing over the sticky Prism composition.

### Reverse sequence

- Scrolling upward lowers the glass panel through native document flow.
- The Prism remains at the discovery distance until the panel has left the
  viewport.
- Continued upward scrolling maps the camera distance back to the fitted home
  distance.
- Returning to the top reproduces the initial view without a snap or stale
  endpoint.

### Scroll geometry

The lab should reproduce the proven nested-sticky structure conceptually:

```text
lab document
├─ sticky Prism runway: 200dvh
│  └─ sticky Prism viewport: 100dvh
└─ glass panel: 100dvh
```

The runway retains the document space that establishes both phases. The inner
viewport keeps the Canvas pinned. The following glass panel participates in
normal flow and paints above the Prism as it enters.

The composition must establish a local stacking context. The Prism must not
use a negative page-level `z-index`; the Canvas belongs to the local base layer
and the glass panel belongs to the local foreground layer.

## Camera and interaction contract

### Scroll input

- The browser owns wheel, trackpad, keyboard, scrollbar, and vertical touch
  scrolling.
- The Canvas must not capture the wheel gesture for zoom.
- `OrbitControls` wheel/pinch zoom is disabled in this lab mode.
- Pointer drag rotation may remain available while the Prism is uncovered.

### Zoom progress

The layout layer derives a normalized presentation value from the first
viewport of route-relative document travel:

```ts
const zoomProgress = clamp(scrollOffset / viewportHeight, 0, 1);
```

The formula communicates the contract, not a required implementation. The
measurement must use the rendered runway and viewport geometry rather than a
hard-coded assumption that the route begins at document coordinate zero.

`zoomProgress` is a semantic presentation input. UI code may pass that
normalized value through the `Prism` facade, but it must not receive or mutate
camera objects, OrbitControls instances, raw camera coordinates, or Three.js
scene objects.

The Stage remains the camera owner. It converts progress into a perspective
camera distance between:

- the existing responsive fitted-home distance; and
- a discovery distance equal to `homeDistance × 0.50`.

The Stage must preserve the existing view offset produced by
`PrismHomeFrame`. Scroll zoom changes distance, not the home-frame projection,
look target, FOV, or semantic Prism rotation.

The mapping may use an internal easing function if visual review finds linear
movement mechanical. Progress and endpoints must remain deterministic and
fully reversible.

### Manual camera interaction

This prototype does not need to solve scroll zoom and user-modified camera
distance simultaneously because manual zoom is disabled. Existing drag
rotation must not cause scroll zoom to reset the camera azimuth or semantic
presentation target.

The existing hero retains its recenter control. Recentring restores its normal
camera orientation while retaining the distance implied by current scroll.

## Glass panel contract

- Reuse the existing `Surface` glass material and semantic theme tokens.
- The panel is visually empty and therefore decorative in this prototype.
- It fills at least one dynamic viewport and is opaque/tinted enough for its
  leading edge and coverage to be judged against every Prism state.
- It owns the foreground visual stacking layer but uses
  `pointer-events: none`, so it does not create a mismatch between pointer and
  keyboard access to the still-visible hero beneath the glass.
- It uses one backdrop-filter owner; no nested glass filter is introduced.
- Under `prefers-reduced-transparency: reduce`, the existing opaque fallback is
  used.
- The panel entrance has no JavaScript-authored translate, spring, or timeline.

The panel's final inset, corner treatment, tint, and opacity are visual-tuning
inputs rather than stable public API.

## Reduced motion

When `prefers-reduced-motion: reduce` is active:

- scroll-scrubbed camera zoom is disabled;
- the Prism holds its fitted home view;
- the nested-sticky layout and native glass-panel entrance remain available;
  and
- the document remains fully scrollable.

The preference must be observed if it changes during the session.

## Architecture and project structure

Likely ownership boundaries are:

```text
app/prism-fiber-lab/
  PrismHeroLayoutLab.tsx           route-level runway and glass composition

src/components/prism-fiber/
  Prism.tsx                        normalized presentation input facade
  stage/PrismStage.tsx             camera-distance mapping and OrbitControls ownership
  stage/                           pure zoom mapping if extraction improves testing

src/components/ui/
  Surface.tsx                      existing glass material consumer
```

The exact file split belongs to implementation planning. The prototype must
not move camera ownership out of `PrismStage`, scene construction out of the
Scene layer, or document-scroll ownership into the Canvas.

## Code style and interface direction

Prefer a normalized, presentation-level boundary:

```ts
interface PrismHeroLayoutHandle {
  setDiscoveryProgress(progress: number): void;
}
```

The name is illustrative and must be finalized during planning. The value is
clamped to `[0, 1]` at one clearly owned boundary. Do not expose a camera
distance, FOV, DOM rectangle, MotionValue implementation type, or Three.js
object through the public facade.

Follow the existing TypeScript, React, Tailwind, and component-colocation
conventions. Do not introduce a new scroll or animation dependency.

## Testing strategy

This change is Level 2 under the project test policy because the experience
depends on scroll boundaries, reversible progress, reduced-motion branching,
and coordination between DOM scroll and the Stage camera.

Automated checks should protect observable or architectural behavior:

- scroll offsets below, within, and above the zoom interval clamp to `0`, an
  intermediate value, and `1`;
- reverse progress produces the same deterministic camera endpoint values;
- the Stage maps home and discovery endpoints without changing view offset,
  FOV, target, or semantic state;
- OrbitControls zoom is disabled for page-scroll integration while drag
  rotation remains enabled;
- reduced motion holds the home camera distance;
- the lab contains one Canvas, one runway, and one foreground glass panel;
- the glass entrance is not driven by a JavaScript transform.

Tests must not assert incidental Tailwind class strings or subjective camera
distance values unless those values become an explicitly approved visual
contract.

Human browser review remains required for:

- continuous forward and reverse zoom without jumps;
- trackpad, wheel, keyboard, scrollbar, and vertical touch scrolling;
- the exact point at which the glass edge enters the viewport;
- drag rotation before coverage and pointer interception after coverage;
- light/dark material legibility if the lab later exposes both modes;
- reduced-motion and reduced-transparency behavior; and
- obvious scroll-linked jank or repeated long tasks.

Performance classification is `possible`. On the same review device, the
prototype must show no visible frame discontinuity during ordinary scrolling
and no repeated scroll-linked main-thread task above 50 ms. Scroll updates
should not require React component rerenders for every pixel of travel.

## Commands

Permitted implementation checks:

```sh
pnpm exec vitest run app/prism-fiber-lab/PrismHeroLayoutLab.test.tsx src/components/prism-fiber/Prism.test.tsx src/components/prism-fiber/stage/PrismStage.test.tsx
pnpm exec tsc --noEmit
git ls-files --cached --others --exclude-standard -z -- '*.js' '*.jsx' '*.mjs' '*.ts' '*.tsx' | xargs -0 pnpm exec eslint --
git diff --check
```

The human controller runs `pnpm dev`, `pnpm build`, and the required browser,
accessibility, reduced-preference, and performance review unless that work is
explicitly delegated.

## Boundaries

### Always

- Keep native document scrolling authoritative.
- Keep camera implementation details inside the Stage.
- Preserve one persistent Prism Canvas and the existing semantic Prism state.
- Reuse the existing glass material and theme tokens.
- Make forward and reverse progress deterministic.
- Preserve unrelated user changes and satisfy `CONSTRAINTS.md`.

### Ask first

- Change the `PrismState` contract or the current initial semantic state.
- Add a dependency.
- Change the established fitted-home camera calculation.
- Remove drag rotation.
- Expand the prototype onto the main application route.
- Add content, navigation, application-mode state, or ambient-render behavior.

### Never

- Capture or synthesize page scrolling.
- Use wheel zoom while the wheel is expected to scroll the page.
- Create a nested page scroller.
- Drive the glass panel entrance with JavaScript.
- Put the Prism behind the document with a negative page-level `z-index`.
- Expose Three.js or OrbitControls objects through normal UI component props.
- Run scroll-scrubbed camera movement under reduced motion.
- Weaken repository constraints or remove tests to make the prototype pass.

## Success criteria

The draft is satisfied when:

1. `/prism-fiber-lab` initially shows the complete existing hero with one
   persistent, full-viewport Prism Canvas.
2. The first `100dvh` of native page travel moves only camera distance from the
   fitted home endpoint to the fixed discovery endpoint.
3. The empty glass panel remains below the viewport during that zoom interval.
4. During the following `100dvh`, the camera holds its discovery endpoint and
   the glass panel rises over the Prism through normal document flow.
5. Reverse scrolling reproduces the same states in reverse without a jump,
   stale endpoint, or hysteresis.
6. Wheel and vertical touch input scroll the document rather than zooming or
   trapping input in the Canvas.
7. Drag rotation remains coherent before the panel covers the Canvas.
8. The decorative foreground panel does not intercept pointer input or remove
   the still-visible hero controls from keyboard navigation.
9. Reduced motion disables camera scrubbing, and reduced transparency uses the
   existing opaque glass fallback.
10. Existing hero copy, CTA, state controls, autoplay, and responsive framing
    remain intact; no application content or NavigationPanel is added.
11. Focused tests, TypeScript, ESLint, and diff checks pass.
12. Human browser review approves zoom pacing, overlay timing, material
    visibility, input ownership, and scroll performance.

## Open questions for prototype review

1. Does a linear distance interpolation feel direct, or should the Stage use a
   reversible ease-in-out mapping?
2. Should the glass panel have a full-width straight leading edge for this
   mechanics test, or use the likely production inset and radius?
3. Is the existing plum/dark lab theme sufficient for the first review, or
   should the same mechanics be checked in one light theme before approval?
