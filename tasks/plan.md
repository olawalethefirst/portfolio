# Implementation Plan: Prism Scroll-Zoom and Glass Overlay Lab

## Status

Approved on 2026-10-06. Automated implementation is complete; human build and
browser review remain pending.

Approved specification:
`docs/context/prism-hero-scroll-zoom-glass-lab-spec.md`

The earlier responsive hero work remains preserved in:

- `tasks/responsive-prism-hero-layout-plan.md`
- `tasks/responsive-prism-hero-layout-todo.md`

## Objective

Place the complete existing `PrismHeroLayout` inside a mechanics demonstration
with one persistent Prism Canvas. Native document scroll drives camera distance
for the first `100dvh`; during the following `100dvh`, an empty glass surface
rises over the pinned hero through document flow alone.

The implementation stops after proving this zoom and overlay relationship. It
does not introduce hero content, a production application handoff, ambient
rendering, navigation, or scroll-driven content choreography.

## Architecture decisions

### 1. Keep one authoritative page scroller

The browser document owns wheel, trackpad, keyboard, scrollbar, and vertical
touch scrolling. The lab introduces no nested scroller and does not prevent or
synthesize scroll input.

`OrbitControls` continues to own drag rotation, target, damping, and azimuth.
Its zoom behavior is disabled for the lab integration so the wheel cannot have
two meanings.

### 2. Reproduce the nested-sticky geometry directly

The route composition mirrors the proven HTML mechanics:

```text
lab document
├─ sticky Prism runway: 200dvh
│  └─ sticky Prism viewport: 100dvh
└─ foreground glass panel: 100dvh
```

The glass panel is a normal-flow sibling after the runway. It paints above the
Prism through a local isolated stacking context. No JavaScript transform moves
the panel, and no negative page-level `z-index` is used.

The expected geometry is:

- document travel `0–100dvh`: Prism isolated; camera zoom progresses `0–1`;
- document travel `100–200dvh`: camera remains at `1`; glass edge travels from
  the viewport bottom to the viewport top.

### 3. Add a semantic imperative presentation command

Per-scroll React state would rerender the route and Three.js boundary for every
sample. Passing a Motion-specific object through `PrismProps` would expose the
chosen animation library at a reusable component boundary.

Instead, extend the existing semantic `PrismHandle` additively:

```ts
export interface PrismStageHandle {
  recentreView(): void;
  setDiscoveryProgress(progress: number): void;
}
```

The command accepts only normalized presentation progress. It does not expose
camera distance, DOM geometry, Motion values, OrbitControls, or Three.js
objects. `Prism` continues to re-export the Stage handle as its stable facade.

The Stage clamps non-finite or out-of-range input to one deterministic safe
value before applying it. The exact invalid-number policy will be locked by a
focused test; the preferred policy is to normalize non-finite values to `0`
and finite values to `[0, 1]`.

### 4. Keep camera math and mutation inside the Stage

`PrismHomeCamera` already owns the fitted home distance, projection offset,
camera target, and responsive reapplication. Extend that owner so it also:

- retains the latest normalized discovery progress;
- derives a discovery endpoint from the fitted home distance;
- maps normalized progress to camera distance;
- reapplies the latest progress when the home frame or viewport changes; and
- updates OrbitControls after changing camera position.

The discovery endpoint is a Stage-owned relationship to the fitted home
distance rather than a route-owned camera coordinate. The fitted home view
reserves 10% of its measured frame, and discovery ends at
`homeDistance × 0.50`. Pure helpers keep clamping, endpoints, monotonicity, and
responsive recomputing testable without changing the public interface.

Scroll zoom changes only camera distance. Existing projection offsets, FOV,
target, drag azimuth, semantic state, and sampled presentation target remain
unchanged.

### 5. Measure route-relative scroll without React render churn

The lab owns a ref to the scroll runway and derives progress from the runway's
rendered start position and the current dynamic viewport height. A small
lab-local hook or adapter may use the existing Motion dependency to observe
scroll and reduced-motion preference, but it must emit plain normalized
numbers to `setDiscoveryProgress()`.

The measurement must not assume that the lab starts at absolute document
coordinate zero. Resize and dynamic viewport changes recompute the mapping.
The listener/subscription is removed on unmount.

When reduced motion becomes active, the route sends progress `0` and stops
scrubbing the camera. When reduced motion becomes inactive, progress resumes
from the current document position.

### 6. Reuse the existing glass material

The foreground uses `Surface material="glass"` with an empty decorative body
that fills at least one dynamic viewport. The existing material owns blur,
tint, ring, shadow, and the reduced-transparency fallback. No second backdrop
filter is introduced.

Because the panel is visually empty and conveys no semantics, it remains out
of the accessibility tree. It is pointer-transparent so the visible hero
beneath it retains consistent pointer and keyboard access.

### 7. Forward discovery progress through the complete hero

`PrismHeroLayout` retains ownership of its content, autoplay, state controls,
responsive home frame, and internal Prism ref. It exposes only a narrow
`setDiscoveryProgress(progress)` handle that delegates to that persistent
Prism. The lab scroll adapter targets this shared semantic interface, so no
camera, Motion, or Three.js type crosses the hero boundary.

## Dependency graph

```text
pure normalized progress and distance mapping
                    │
                    ▼
additive Prism handle command + Stage camera application
                    │
                    ▼
route-relative scroll adapter
                    │
                    ▼
nested-sticky lab + normal-flow glass panel
                    │
                    ▼
human browser pacing and input review
```

The work is sequential because the lab scroll adapter depends on the semantic
Stage command, and the visual composition must be reviewed with the real camera
endpoint. Parallel implementation would create conflicting edits in the Prism
facade and lab tests without reducing risk.

## Implementation phases

### Phase 1: Prove the camera command

1. Add the smallest pure mapping needed to convert normalized discovery
   progress and the responsive fitted-home distance into a camera distance.
2. Extend `PrismStageHandle` additively with
   `setDiscoveryProgress(progress)` and connect it to the existing
   `PrismHomeCamera` owner.
3. Disable OrbitControls zoom while retaining drag rotation, damping, target,
   and sampled azimuth behavior.

#### Checkpoint 1: Camera boundary

- Progress `0`, intermediate progress, `1`, out-of-range values, and non-finite
  values resolve deterministically.
- Progress changes camera distance without changing projection, FOV, target,
  semantic state, or camera azimuth.
- A home-frame or viewport resize reapplies the same normalized progress to the
  newly fitted home distance.
- Existing recenter behavior remains defined: recenter restores the current
  scroll-derived distance and zero azimuth rather than fighting the next scroll
  sample.
- Focused Stage and Prism facade tests pass before route integration begins.

### Phase 2: Demonstrate native scroll and overlay geometry

4. Replace the lab's current `PrismHeroLayout` consumer with one direct,
   persistent `Prism` instance in the nested-sticky runway.
5. Derive route-relative `0–1` zoom progress across the first rendered
   `100dvh` and stream it to the semantic Prism handle without per-pixel React
   state.
6. Add one empty `100dvh` foreground `Surface` using the existing glass
   material and local positive stacking layers.
7. Apply the reactive reduced-motion path and preserve the existing
   reduced-transparency behavior.

#### Checkpoint 2: Lab acceptance

- The route has one complete hero and one Canvas, no application content or
  nested scroller, and no JavaScript transform on the glass panel.
- The first viewport of travel controls only camera distance.
- The second viewport of travel raises the glass over a camera held at its
  discovery endpoint.
- Reverse travel is continuous and deterministic.
- Focused tests, TypeScript, ESLint, and `git diff --check` pass.
- The human controller runs the production build and completes browser,
  keyboard, touch, reduced-preference, and performance review.

## Verification strategy

### Automated checks

Use test-first slices. Tests should assert semantic outputs and camera calls,
not incidental Tailwind strings or subjective pixels.

```sh
pnpm exec vitest run src/components/prism-fiber/stage/PrismStage.test.tsx src/components/prism-fiber/Prism.test.tsx
pnpm exec vitest run app/prism-fiber-lab/PrismHeroLayoutLab.test.tsx
pnpm exec tsc --noEmit
git ls-files --cached --others --exclude-standard -z -- '*.js' '*.jsx' '*.mjs' '*.ts' '*.tsx' | xargs -0 pnpm exec eslint --
git diff --check
```

The implementation agent may run these permitted checks. Under
`CONSTRAINTS.md`, the human controller owns `pnpm build`, application-server
startup, real-browser inspection, accessibility review, and performance review
unless explicitly delegated.

### Test scope classification

Level 2 — required. The behavior combines scroll boundaries, reversible
progress, reactive reduced-motion branching, mutable camera coordination, and
responsive home-frame recalculation.

### Human-controller review

Review at minimum:

- desktop wheel and trackpad scrolling;
- keyboard Page Down/Page Up and scrollbar dragging;
- phone portrait vertical touch scrolling;
- forward, reverse, and rapid direction reversal;
- drag rotation before coverage;
- pointer interception after coverage;
- reduced motion and reduced transparency changed during the session;
- narrow and wide viewport camera containment; and
- visible jank or repeated scroll-linked tasks above 50 ms.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Nested sticky behavior differs across viewport/browser conditions | High | Preserve the exact minimal structure, avoid transformed ancestors, and require browser review before expanding scope |
| Scroll updates fight responsive home-frame updates | High | Store normalized progress in the Stage and reapply it after every home-distance calculation |
| Recenter and scroll progress define competing camera distances | Medium | Define recenter as azimuth/home-frame restoration while retaining the current scroll-derived distance |
| OrbitControls captures wheel or touch scroll | High | Disable zoom, preserve page-owned scroll, and verify wheel plus vertical touch explicitly |
| React rerenders on every scroll sample | Medium | Use the semantic imperative handle and mutable Stage owner rather than route state |
| Discovery endpoint clips the Prism on narrow screens | High | Derive it from fitted distance and block visual acceptance until narrow-view review passes |
| Empty glass appears invisible or too opaque | Medium | Tune existing semantic glass variables/geometry in browser without changing the motion contract |
| Reduced-motion toggling leaves a stale camera position | Medium | Reactively write progress `0`, then recompute from current scroll when the preference is removed |

## Explicitly deferred

- Hero copy, CTA, state controls, and autoplay UI.
- Changes to the existing hero copy, state selection, autoplay, or controls.
- Hero-content withdrawal or opacity animation.
- Application content and natural scrolling beyond the empty panel.
- Ambient Prism lighting, saturation, interaction, or render-loop changes.
- NavigationPanel visibility.
- Production-route integration.
- Pinch-specific custom gesture handling.

## Review decisions

The implementation can begin after approval of these decisions:

1. Use the additive imperative `setDiscoveryProgress(number)` boundary to
   avoid React scroll rerenders and Motion-type leakage.
2. Define recentering as preserving the current scroll-derived distance while
   restoring the home projection/target and zero azimuth.
3. Reserve 10% of the responsive home frame and use
   `homeDistance × 0.50` as the discovery endpoint without making either value
   part of the public component contract.
4. Keep the first visual review on the existing plum/dark lab theme; light-mode
   comparison remains optional unless the glass cannot be judged confidently.
