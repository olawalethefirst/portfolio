# Task List: Responsive Prism Hero Layout Review

Source plan: `tasks/plan.md`

Authoritative layout review:
`docs/context/responsive-prism-hero-layout-review.md`

Stop at every checkpoint. This task list ends at responsive layout approval;
scroll and application-mode work require a later approved plan.

## Phase 1: Simplify the semantic hero

### Task 1: Define the compact state-led content model

**Description:** Replace the current stable description plus separate narrative
card with one typed editorial model: short stable title, one-line state tagline,
optional state description, and paired Work/Contact actions.

**Acceptance criteria:**

- [x] One exhaustive typed record covers Idea, Iterate, and Solution tagline
  and description content.
- [x] The active `PrismState` drives the Prism, tagline, and visible description
  without a duplicate narrative region.
- [x] Work and Contact are adjacent one-word actions with one primary and one
  subordinate treatment.

**Verification:**

- [x] `pnpm exec vitest run src/components/prism-fiber/ui/hero/PrismHeroLayout.test.tsx`
- [x] TypeScript, repository ESLint, and `git diff --check` pass.
- [ ] Human controller confirms the title/taglines stay one line and every
  description stays within two lines at its visible targets.

**Dependencies:** None.

**Files likely touched:**

- `src/components/prism-fiber/ui/hero/prism-hero-content.ts`
- `src/components/prism-fiber/ui/hero/PrismHeroLayout.tsx`
- `src/components/prism-fiber/ui/hero/PrismHeroLayout.test.tsx`

**Estimated scope:** M.

### Task 2: Configure compact Prism-only hero controls

**Description:** Reuse `HeroControlPanel` in a compact hero configuration with
labeled outline playback/recenter actions, an `xs` progress line, and primary
state tabs. Keep the standalone showcase configuration intact.

**Acceptance criteria:**

- [x] Controls contain no portfolio CTA or narrative content.
- [x] Idea, Iterate, and Solution selection plus progress/play/pause remain
  operable by pointer and keyboard with at least 44 px hit targets.
- [x] Play/pause and recenter remain separate labeled outline actions in the
  first row, followed by progress and the primary state tabs.

**Verification:**

- [x] `pnpm exec vitest run src/components/ui/hero-control-panel/HeroControlPanel.test.tsx`
- [x] TypeScript, repository ESLint, and `git diff --check` pass.
- [ ] Human controller reviews focus order, accessible names, and compact density.

**Dependencies:** Task 1.

**Files likely touched:**

- `src/components/ui/hero-control-panel/HeroControlPanel.tsx`
- `src/components/ui/hero-control-panel/HeroControlPanel.test.tsx`
- `src/components/prism-fiber/ui/hero/PrismHeroLayout.tsx`

**Estimated scope:** M.

### Task 3: Collapse the lab to one responsive composition

**Description:** Remove the three-column variant and layout selector while
preserving one Prism instance, semantic state, and the shared hero DOM.

**Acceptance criteria:**

- [x] No three-column type, branch, control, copy, or test expectation remains.
- [x] The lab renders one two-column-capable semantic tree and one Canvas without
  resetting state during ordinary rerenders.
- [x] Lab-only chrome no longer competes with the hero content.

**Verification:**

- [x] `pnpm exec vitest run app/prism-fiber-lab/PrismHeroLayoutLab.test.tsx`
- [x] TypeScript, repository ESLint, and `git diff --check` pass.

**Dependencies:** Tasks 1 and 2.

**Files likely touched:**

- `app/prism-fiber-lab/PrismHeroLayoutLab.tsx`
- `app/prism-fiber-lab/PrismHeroLayoutLab.test.tsx`
- `src/components/prism-fiber/ui/hero/PrismHeroLayout.tsx`

**Estimated scope:** S.

## Checkpoint 1: Content and controls

- [x] Tasks 1–3 automated checks pass.
- [x] One state value updates Prism and editorial content coherently.
- [x] Work/Contact and the three-row stage controls remain visually distinct.
- [ ] Human controller approves content density before framing work.

## Phase 2: Make layout and Three.js cooperate

### Task 4: Define normalized home-frame measurement

**Description:** Add a pure clamped rectangle contract and a measurement adapter
that converts the layout's frame element into Canvas-relative normalized values.

**Acceptance criteria:**

- [x] The contract contains only normalized `left`, `top`, `width`, and `height`
  values with no camera or Three.js type.
- [x] Zero-size, partial-overlap, over-range, resize, and initial-unmeasured
  cases resolve deterministically.
- [x] Measurement uses element geometry/`ResizeObserver`, not breakpoint state or
  `window.innerWidth`.

**Verification:**

- [x] Pure measurement and focused hook tests pass.
- [x] Focused hook/component tests pass where measurement integration requires them.
- [x] TypeScript, repository ESLint, and `git diff --check` pass.

**Dependencies:** Tasks 1 and 2 for the approved phone slice.

**Files likely touched:**

- `src/components/prism-fiber/ui/hero/prism-home-frame-measurement.ts`
- `src/components/prism-fiber/ui/hero/prism-home-frame-measurement.test.ts`
- `src/components/prism-fiber/ui/hero/usePrismHomeFrame.ts`
- `src/components/prism-fiber/ui/hero/PrismHeroLayout.tsx`

**Estimated scope:** M.

### Task 5: Fit the Prism optically inside the measured frame

**Description:** Extend the Prism facade and Stage with the additive normalized
frame, stable scene bounds, and pure perspective-fit/projection calculations.

**Acceptance criteria:**

- [x] Stage-owned math fits conservative Prism bounds against both frame axes,
  preserves uniform scale, and uses one stable optical center for all states.
- [x] UI code supplies no camera coordinates, FOV, object scale, or Three.js
  object; existing Prism consumers retain full-frame defaults.
- [x] Frame changes do not fight drag rotation, zoom detection, damping, or
  recentering.

**Verification:**

- [x] Focused home-frame, Stage, and Prism API tests pass.
- [x] TypeScript, repository ESLint, and `git diff --check` pass.
- [ ] Human controller checks portrait, landscape, and desktop frame fixtures
  before responsive styling continues.

**Dependencies:** Task 4.

**Files likely touched:**

- `src/components/prism-fiber/Prism.tsx`
- `src/components/prism-fiber/stage/prism-home-frame.ts`
- `src/components/prism-fiber/stage/prism-home-frame.test.ts`
- `src/components/prism-fiber/stage/PrismStage.tsx`
- `src/components/prism-fiber/stage/PrismStage.test.tsx`

**Estimated scope:** M.

### Task 5A: Define view-relative rotation target resolution

**Description:** Define the internal presentation-target contract and pure
rotation math before connecting it to OrbitControls. A target combines the
canonical state angle with one sampled view azimuth, while the rotation channel
resolves the nearest equivalent angle for interruption-safe, shortest-path
motion.

**Acceptance criteria:**

- [x] Zero view offset preserves the existing Idea, Iterate, and Solution
  rotation targets exactly.
- [x] Positive and negative offsets resolve deterministic absolute targets,
  and equivalent angles across the wrap boundary take the shortest path.
- [x] The offset affects only Prism rotation; figure pose and monitor opacity
  continue to resolve exclusively from `PrismState`.

**Verification:**

- [x] Pure rotation tests cover zero offset, positive and negative azimuth,
  wraparound, and shortest-path resolution.
- [x] Transition tests prove that the view offset affects only the rotation
  channel while pose and opacity still follow `PrismState`.
- [x] `pnpm exec vitest run src/components/prism-fiber/motion/prism-rotation.test.ts src/components/prism-fiber/motion/prism-transition.test.ts`
- [x] TypeScript, repository ESLint, and `git diff --check` pass.

**Dependencies:** Task 5 and the existing semantic transition controller.

**Files likely touched:**

- `src/components/prism-fiber/motion/prism-rotation.ts`
- `src/components/prism-fiber/motion/prism-rotation.test.ts`
- `src/components/prism-fiber/motion/prism-transition.ts`
- `src/components/prism-fiber/motion/prism-transition.test.ts`
- `src/components/prism-fiber/scene/PrismStructure.ts`

**Estimated scope:** M.

### Task 5B: Sample and hold the current view frame

**Description:** Connect the pure target contract to OrbitControls. When a new
semantic state reaches the Stage, capture the current camera azimuth once,
hold it with that state as one presentation request, and pass it to the Scene.
Do not reset the camera or update the held offset continuously during drag.

**Acceptance criteria:**

- [ ] Selecting a different named state after orbiting presents that state's
  intended face from the current camera position without recentering the camera.
- [x] Camera azimuth is sampled once per semantic transition; the Prism does
  not chase or counter-rotate continuously during a pointer gesture.
- [x] Initial centered presentation, interrupted state transitions, autoplay
  ordering, zoom, damping, and explicit recenter behavior remain unchanged.

**Verification:**

- [x] Stage tests reproduce the failure by orbiting, changing semantic state,
  and asserting one held presentation target with the sampled azimuth.
- [x] Scene tests prove initial snap and subsequent transitions receive the
  combined state/view target without rebuilding the scene.
- [x] `pnpm exec vitest run src/components/prism-fiber/stage/PrismStage.test.tsx src/components/prism-fiber/scene/PrismScene.test.tsx`
- [x] TypeScript, repository ESLint, and `git diff --check` pass.
- [ ] Human controller orbits left and right, selects every named state, and
  confirms correct faces, harmonious motion, preserved camera position, and no
  long spin near the azimuth wrap boundary.

**Dependencies:** Task 5A.

**Files likely touched:**

- `src/components/prism-fiber/stage/PrismStage.tsx`
- `src/components/prism-fiber/stage/PrismStage.test.tsx`
- `src/components/prism-fiber/scene/PrismScene.tsx`
- `src/components/prism-fiber/scene/PrismScene.test.tsx`

**Estimated scope:** M.

## Checkpoint 2: Framing proof

- [x] Tasks 4–5B automated checks pass.
- [ ] The Prism remains proportionate and optically centered in every fixture.
- [ ] The controller confirms named-state rotation, camera interaction, and
  recenter remain coherent after orbiting.
- [ ] Stop if layout placement requires raw camera values in UI code.

## Phase 3: Compose every review breakpoint

### Task 6: Compose small screens

**Description:** Implement a full-viewport phone Canvas with top/bottom overlays
in both orientations and a provisional measured Prism home-frame marker. Keep
the state description visible and defer scroll-driven zoom; Task 6A replaces
the marker with live UI boundaries.

**Acceptance criteria:**

- [x] Phone Canvas fills the complete hero while content and controls are
  positioned independently from the top and bottom.
- [x] The Prism starts inside the measured home frame without clipping or
  nonuniform scaling.
- [x] Short landscape retains the same overlay structure instead of entering an
  intermediate single-column grid.

**Verification:**

- [x] Focused hero tests, TypeScript, ESLint, and diff checks pass.
- [ ] Human controller reviews 375 px portrait.

**Dependencies:** Tasks 1, 2, 4, and 5.

**Files likely touched:**

- `src/components/prism-fiber/ui/hero/PrismHeroLayout.tsx`
- `src/components/prism-fiber/ui/hero/PrismHeroLayout.test.tsx`
- `src/components/ui/hero-control-panel/HeroControlPanel.tsx`
- `app/prism-fiber-lab/PrismHeroLayoutLab.tsx`

**Estimated scope:** M.

### Task 6A: Derive the Prism home frame from live UI boundaries

**Description:** Replace the fixed invisible home-frame marker with an
occlusion-aware measurement of the full Canvas, top hero content, and bottom
Prism controls. Keep the existing normalized `PrismHomeFrame` API and Stage
camera fitting unchanged.

**Acceptance criteria:**

- [x] A pure geometry function derives the normalized frame from the content's
  lower boundary and controls' upper boundary, retains stable horizontal
  gutters, applies `1rem` vertical clearance, and handles partial/out-of-Canvas
  rectangles deterministically.
- [x] Short viewports enforce an `11rem` minimum physical frame and allow
  predictable natural overlap; side-by-side surfaces that do not horizontally
  occlude the Canvas do not reduce its frame.
- [x] The fixed marker is removed, and `ResizeObserver` updates the home frame
  when the Canvas, content, or controls change size without viewport-width
  JavaScript.

**Verification:**

- [x] Pure measurement tests cover normal space, short-screen collision,
  partial overlap, side-by-side layout, and zero-size elements.
- [x] Focused hook and hero tests prove initial measurement, resize updates,
  deduplication, and semantic layout remain intact.
- [x] TypeScript, repository ESLint, and `git diff --check` pass.
- [ ] Human controller reviews tall and short phone portraits and confirms that
  recenter restores the latest derived home frame.

**Dependencies:** Tasks 4–6.

**Files likely touched:**

- `src/components/prism-fiber/ui/hero/prism-home-frame-measurement.ts`
- `src/components/prism-fiber/ui/hero/prism-home-frame-measurement.test.ts`
- `src/components/prism-fiber/ui/hero/usePrismHomeFrame.ts`
- `src/components/prism-fiber/ui/hero/usePrismHomeFrame.test.tsx`
- `src/components/prism-fiber/ui/hero/PrismHeroLayout.tsx`

**Estimated scope:** M.

### Task 7: Compose tablet portrait and landscape

**Description:** Extend the full-Canvas overlay and measured Prism home frame
through tablet portrait, then transition directly to an asymmetric
content/stage split at `md:landscape` without changing the semantic DOM. Keep
the Canvas full-hero in the split; content uses the grid while controls are
positioned independently above the Canvas.

**Acceptance criteria:**

- [x] Tablet portrait preserves the full-viewport Canvas, top content overlay,
  bottom controls, and boundary-derived Prism home frame.
- [x] Tablet landscape places editorial content on the left and absolutely
  positions controls on the right while one Canvas spans the complete hero.
- [x] Editorial content remains in normal grid flow with its interactive
  descendants above the Canvas; it does not require absolute positioning.
- [ ] Every state description fits the reserved two-line region without layout shift.

**Verification:**

- [x] Focused hero tests, TypeScript, ESLint, and diff checks pass.
- [ ] Human controller reviews 768 px portrait and the agreed landscape fixture.

**Dependencies:** Task 6A.

**Estimated scope:** S.

### Task 8: Measure the two-column Prism home frame

**Description:** Extend the existing pure geometry adapter so a viable
right-side region begins at the measured editorial content's right edge plus
clearance. Use that normalized region for the initial and recentered Prism pose,
then scale the same relationship through compact and wide desktop.

**Acceptance criteria:**

- [x] Pure measurement tests prove that a viable side region starts after the
  measured content right edge, retains the outer Canvas inset and full Canvas
  height, and does not change when the controls move or resize.
- [x] When the measured side region is narrower than the minimum useful physical
  width of `20rem`, the adapter retains the existing stacked top/bottom frame
  instead of inferring a breakpoint from viewport width.
- [x] Both compact and wide desktop use one full-hero Canvas; the initial Prism
  stays vertically centered in the measured right-side frame, controls remain
  out of layout flow below it, and zoom can enlarge the Prism across the frame
  boundary behind the higher-z-index editorial content.

**Verification:**

- [x] Pure measurement, hook, hero-layout, Stage, and Prism API tests pass.
- [x] TypeScript, repository ESLint, and `git diff --check` pass.
- [ ] Human controller confirms initial separation, zoom bleed, pointer access,
  and recentering at tablet landscape, compact desktop, and 1440 px.

**Dependencies:** Task 7.

**Files likely touched:**

- `src/components/prism-fiber/ui/hero/prism-home-frame-measurement.ts`
- `src/components/prism-fiber/ui/hero/prism-home-frame-measurement.test.ts`
- `src/components/prism-fiber/ui/hero/usePrismHomeFrame.ts`
- `src/components/prism-fiber/ui/hero/usePrismHomeFrame.test.tsx`
- `src/components/prism-fiber/ui/hero/PrismHeroLayout.tsx`

**Estimated scope:** M.

### Task 9: Record the accepted responsive layout

**Description:** Stop implementation, collect the controller's build and visual
results, revise rejected details, and consolidate the accepted breakpoint and
framing contract into durable documentation.

**Acceptance criteria:**

- [ ] The controller accepts content, controls, Prism prominence, and framing at
  every target viewport and semantic state.
- [ ] The controller runs `pnpm build` successfully and completes keyboard,
  touch, light/dark, and text-scaling review.
- [ ] Durable documentation contains only the accepted layout direction and
  explicitly defers scroll/application behavior to a later plan.

**Verification:**

- [ ] Full tests, TypeScript, repository ESLint, and `git diff --check` pass.
- [ ] Human-controller results are recorded before the task is accepted.

**Dependencies:** Tasks 5B, 6–8, and Checkpoint 2.

**Files likely touched:**

- `docs/context/responsive-prism-hero-layout-review.md`
- `docs/context/responsive-prism-hero-spec.md`
- `docs/context/prism-fiber-architecture.md`

**Estimated scope:** S, human-decision task.

## Checkpoint 3: Layout approval

- [ ] Tasks 5A–5B, 6, 6A, and 7–9 are complete.
- [ ] All automated and human-owned checks pass.
- [ ] The responsive layout and framing contract are approved.
- [ ] Do not begin scroll, glass handoff, ambient mode, or navigation work under
  this plan.
