# Task List: Prism Scroll-Zoom and Glass Overlay Lab

Source plan: `tasks/plan.md`

Approved specification:
`docs/context/prism-hero-scroll-zoom-glass-lab-spec.md`

The archived responsive-layout checklist remains at
`tasks/responsive-prism-hero-layout-todo.md` and is not superseded by this
prototype.

## Phase 1: Camera discovery boundary

### Task 1: Add normalized discovery progress to the Prism Stage

**Description:** Define the pure normalized-progress-to-camera-distance mapping
and extend the existing Prism handle with an additive semantic
`setDiscoveryProgress(progress)` command. Apply progress inside the current
home-camera owner so responsive fitting, view offset, recentering, and scroll
zoom have one camera authority. Disable OrbitControls zoom while preserving
drag rotation and sampled azimuth behavior.

**Acceptance criteria:**

- [x] Progress `0`, intermediate progress, `1`, out-of-range input, and
  non-finite input produce deterministic camera distances derived from the
  fitted home distance.
- [x] Calling `setDiscoveryProgress()` changes camera distance without exposing
  or changing FOV, projection offset, target, semantic state, or azimuth; the
  latest progress is reapplied after a home-frame or viewport change.
- [x] OrbitControls wheel/pinch zoom is disabled, while rotation, damping,
  target ownership, sampled semantic-state azimuth, and recenter behavior
  remain intact.

**Verification:**

- [x] Write failing focused tests before implementation.
- [x] `pnpm exec vitest run src/components/prism-fiber/stage/PrismStage.test.tsx src/components/prism-fiber/Prism.test.tsx`
- [x] `pnpm exec tsc --noEmit`
- [x] Repository ESLint command and `git diff --check` pass.

**Dependencies:** None.

**Files likely touched:**

- `src/components/prism-fiber/stage/prism-discovery-view.ts`
- `src/components/prism-fiber/stage/prism-discovery-view.test.ts`
- `src/components/prism-fiber/stage/PrismStage.tsx`
- `src/components/prism-fiber/stage/PrismStage.test.tsx`
- `src/components/prism-fiber/Prism.test.tsx`

**Estimated scope:** M. If the pure helper is unnecessary after the red test,
keep the same behavior inside the Stage and omit the extra files.

## Checkpoint 1: Camera boundary

- [x] Task 1 acceptance criteria pass.
- [x] Existing Prism state, framing, orbit, and recenter tests remain green.
- [x] Stop if camera coordinates or a Motion-specific type must cross the
  `Prism` facade.

## Phase 2: Native-scroll lab composition

### Task 2: Build the complete-hero nested-sticky scroll demonstration

**Description:** Place the complete existing hero inside the
`200dvh`/`100dvh` nested-sticky composition and forward normalized discovery
progress through a narrow hero handle to its persistent Prism. Measure the
route's rendered scroll position without per-pixel React state, and add one
empty normal-flow `100dvh` glass Surface above the hero stacking layer. Observe
reduced motion reactively; reuse the existing reduced-transparency fallback.

**Acceptance criteria:**

- [x] `/prism-fiber-lab` contains the complete existing hero with exactly one
  persistent Prism Canvas, unchanged editorial content, CTA, autoplay,
  recentering, semantic-state controls, and responsive home-frame behavior.
- [x] Native scroll maps route-relative travel `0–100dvh` to discovery progress
  `0–1`, clamps outside that interval, reverses deterministically, and holds
  `0` while reduced motion is active without rerendering React for every scroll
  sample.
- [x] One empty decorative glass Surface remains in normal flow, begins rising
  only after the zoom interval, paints above the Prism without a negative
  page-level `z-index`, and has no JavaScript-authored movement.

**Verification:**

- [x] Write or replace focused lab tests before implementation.
- [x] `pnpm exec vitest run app/prism-fiber-lab/PrismHeroLayoutLab.test.tsx`
- [x] `pnpm exec vitest run src/components/prism-fiber/stage/PrismStage.test.tsx src/components/prism-fiber/Prism.test.tsx`
- [x] `pnpm exec tsc --noEmit`
- [x] Repository ESLint command and `git diff --check` pass.
- [ ] Human controller runs `pnpm build` and reviews wheel, trackpad, keyboard,
  scrollbar, vertical touch, reverse scroll, reduced motion, reduced
  transparency, pointer interception, camera containment, and performance.

**Dependencies:** Task 1 and Checkpoint 1.

**Files likely touched:**

- `app/prism-fiber-lab/PrismHeroLayoutLab.tsx`
- `app/prism-fiber-lab/PrismHeroLayoutLab.test.tsx`
- `app/prism-fiber-lab/usePrismDiscoveryScroll.ts`
- `app/prism-fiber-lab/usePrismDiscoveryScroll.test.tsx`

**Estimated scope:** M.

## Checkpoint 2: Prototype acceptance

- [x] Tasks 1–2 and all automated checks pass.
- [ ] Human controller confirms that the first `100dvh` feels like intentional
  Prism discovery rather than delayed page response.
- [ ] Human controller confirms that the panel begins entering at the intended
  boundary and rises through native flow without a snap or unexpected sticky
  release.
- [x] The controller selected 90% home-frame occupancy and
  `homeDistance × 0.50` as the discovery endpoint.
- [ ] Human controller selects whether linear or eased progress is accepted.
- [ ] The approved outcome is reflected in the durable spec and Prism
  architecture documentation before the prototype is treated as complete.
