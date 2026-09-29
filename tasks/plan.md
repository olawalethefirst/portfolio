# Implementation Plan: Responsive Prism Hero Layout Review

## Status

Approved on 2026-09-27 from the layout/content review. The implemented slice
gives phone a full-viewport Canvas, top/bottom HTML overlays, and a measured
`PrismHomeFrame` derived from the actual hero and control boundaries. Stage
framing owns initial placement and recentering. The lab now presents only the
approved asymmetric composition. Scroll-driven zoom remains deferred until its
activation behavior is approved.

Authoritative layout review:

- `docs/context/responsive-prism-hero-layout-review.md`

Broader experience specification:

- `docs/context/responsive-prism-hero-spec.md`

Task execution is tracked in `tasks/todo.md`.

## Objective

Produce one responsive hero composition for visual approval before any scroll
or application-mode work. The hero uses concise state-led copy, paired one-word
actions, compact Prism-only controls, and a single two-column desktop direction.
The implementation must also prove that HTML layout can position a virtual
Prism frame while the Stage fits the 3D object into it without distortion.

## Architecture decisions

### 1. One editorial unit

The hierarchy is:

```text
identity
stable title
state tagline
state description
Work + Contact
```

There is no separate general description followed by a state card. The active
`PrismState` selects both the tagline/description and the 3D scene state.

### 2. Controls contain interaction, not hero content

The hero reuses `HeroControlPanel` with its portfolio-action region disabled.
The compact glass surface presents labeled outline playback/recenter actions,
an `xs` autoplay progress line, and primary state tabs as three tightly spaced
rows. Direct rotation is intentionally discovered rather than explained with
instructional copy.

### 3. One responsive composition

Phone uses a full-viewport Canvas with editorial content positioned from the top
and controls positioned from the bottom. The initial Prism frame occupies the
usable vertical space between those rendered surfaces, with a deliberate gap
and stable horizontal gutters. When a short viewport cannot provide the minimum
usable frame, the frame expands into the UI regions predictably rather than
switching to a manually selected layout mode. Tablet landscape and desktop use
the asymmetric split. In that split, the Canvas still spans the complete hero
behind the HTML layers; only the Prism's initial home frame occupies the
measured region to the right of the editorial content. There is no final
three-column direction.

The initial geometry defaults are a `1rem` clearance from each UI boundary, the
existing 5% outer horizontal gutter, an `11rem` minimum frame height, and a
`20rem` minimum useful right-side frame width matching the current Stage floor.
They remain layout constants, not public Prism API.

### 4. Layout communicates a frame, not camera instructions

One full-hero Canvas renders behind the semantic content tree at every
breakpoint. The layout measures the actual hero-content and Prism-control
rectangles against the Canvas rectangle and produces a clamped,
Canvas-relative `PrismHomeFrame` with normalized `left`, `top`, `width`, and
`height` values.

On stacked layouts, the content's lower edge and controls' upper edge define the
vertical home region. On two-column layouts, the measured content right edge
plus clearance defines the home region's left edge; the outer Canvas inset
defines its right edge, and the home frame retains the Canvas's full vertical
range. Neither the content nor the controls constrain the Prism vertically when
enough useful width exists beside the content. The controls are independently
positioned below the Prism as an absolute overlay and do not occupy a grid row.

The geometry adapter determines whether the right-side region is viable from
the rendered rectangles and a minimum useful physical width. It does not read a
breakpoint, orientation, or `window.innerWidth`. CSS remains responsible for
placing content and controls; measurement only reports the resulting available
region.

This additive boundary carries only layout geometry. It does not expose camera
coordinates, Three.js objects, raw angles, scene scale, or Motion values.

### 5. Stage owns optical fitting

The Stage maps Canvas size, the normalized home frame, and stable scene
bounds to camera distance/projection offset. It fits against both frame axes,
uses uniform scale, and retains one stable optical center across semantic state
transitions. OrbitControls continues to own manual camera interaction.

### 6. Layout approval precedes motion

This plan stops after responsive visual approval. Scroll discovery, application
handoff, ambient mode, and conditional navigation remain deferred to a new
approved plan based on the accepted geometry.

## Dependency graph

```text
typed concise content ──────┐
                            ├── unified semantic hero
compact stage controls ─────┘            │
                                         ├── home-frame measurement
                                         │              │
                                         │              ▼
                                         │       Stage optical fitting
                                         │              │
                                         ▼              ▼
                               responsive breakpoint compositions
                                         │
                                         ▼
                                  human visual approval
```

## Implementation phases

### Phase 1: Simplify the semantic hero

1. Replace the current copy with the typed compact editorial model and one-word
   actions.
2. Reuse the existing `HeroControlPanel` as a compact three-row Prism-only
   surface in the hero, while retaining its standalone showcase configuration.
3. Remove the three-column variant and lab selector, leaving one semantic hero
   tree ready for responsive composition.

#### Checkpoint 1: Content and controls

- One `PrismState` drives scene, tagline, and description.
- Work and Contact remain adjacent and semantically distinct.
- The hero contains one Canvas and no duplicate CTA or narrative region.
- Controls expose labeled playback/recenter actions, progress, and state
  selection only.

### Phase 2: Make layout and Three.js cooperate

4. Define and test normalized home-frame measurement from DOM geometry.
5. Add stable scene bounds and Stage-owned optical fit/projection behavior, then
   integrate the measured frame through the Prism facade.

#### Checkpoint 2: Framing proof

- Portrait, landscape, tablet, and desktop frame rectangles produce stable
  clamped values.
- The Prism fits both width and height without nonuniform scaling.
- State transitions do not shift the optical center.
- Drag rotation, zoom state, damping, and recenter remain coherent.

### Phase 3: Compose every review breakpoint

6. Implement the small-screen composition around the existing Prism stage.
   Keep the state description visible and establish one full-Canvas overlay
   composition across portrait and landscape.
6A. Replace the fixed phone marker with an occlusion-aware home frame derived
   from the rendered hero-content and Prism-control bounds. Preserve the current
   normalized `PrismHomeFrame` boundary and Stage-owned camera fitting.
7. Extend the full-Canvas overlay composition through tablet portrait, then
   place content in the asymmetric grid at `md:landscape`, position the controls
   independently below the Prism, and retain the full-hero Canvas behind both
   columns.
8. Derive the two-column Prism home frame from the measured content right edge,
   and carry the same expanding composition through compact and wide desktop.
9. Stop for human build and visual review, record corrections, and update the
   durable breakpoint contract after approval.

#### Checkpoint 3: Layout approval

- The controller reviews every target viewport in light and dark mode.
- The Prism remains above the fold and optically contained in its frame.
- In two-column mode, the Prism initially begins after the measured editorial
  boundary and can grow behind that content when zoomed.
- Text, actions, and controls follow the breakpoint disclosure rules.
- No horizontal scrolling, clipped focus, duplicate focusable subtree, or
  control target below 44 px remains.
- No motion or application-mode implementation begins without a new approval.

## Verification strategy

### Automated after each task

```sh
pnpm exec vitest run <affected-test-paths>
pnpm exec tsc --noEmit
git ls-files --cached --others --exclude-standard -z -- '*.js' '*.jsx' '*.mjs' '*.ts' '*.tsx' | xargs -0 pnpm exec eslint --
git diff --check
```

Tests protect semantic ownership, one Canvas, responsive disclosure flags,
normalized frame math, and Stage endpoints. They do not lock subjective pixel
values or replace browser review.

### Human-controller verification

The controller runs `pnpm build` and reviews 375 px portrait, short phone
landscape, 768 px portrait, tablet landscape, 1024 px, and 1440 px. Review
checks content wrapping, above-fold Prism prominence, touch/keyboard behavior,
light/dark contrast, and framing under every semantic state.

The implementation agent does not start a server, run the production build, or
perform browser inspection unless explicitly delegated.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| One-line title becomes generic | High | Evaluate concise copy for positioning clarity, not length alone |
| State copy changes surrounding layout | High | Reserve description measure/height using the longest approved state |
| Compact controls lose accessible target size | High | Separate visual density from a minimum 44 px hit area |
| DOM measurement leaks camera implementation into UI | High | Pass only a normalized frame; Stage owns projection and fitting |
| Framing fights OrbitControls | High | Use projection offset for placement and keep one camera/interaction owner |
| Animated assets exceed measured bounds | High | Capture conservative stable scene bounds once with explicit padding |
| Phone Prism ignores the available live UI space | High | Derive the frame from the actual top-content and bottom-control boundaries |
| UI boundaries leave no usable gap on short screens | High | Enforce a minimum physical frame, clamp it to the Canvas, and allow predictable natural overlap |
| Side-by-side content incorrectly constrains the frame vertically | High | Once a viable right-side frame exists, use the content edge only as its horizontal boundary |
| A hard-coded `41%` diverges from the rendered content edge | High | Normalize the measured content right edge against the full Canvas and retain only an outer inset/clearance as layout constants |
| Two-column Canvas remains clipped to the stage column | High | Make the Canvas cover the hero and use the normalized home frame—not the DOM Canvas bounds—for initial placement |
| Geometry selects a narrow side frame on small screens | High | Require a minimum useful physical width before selecting the right-side frame; otherwise retain stacked top/bottom framing |
| Controls shift or resize the two-column Prism | High | Keep controls out of grid flow and ignore their rectangle once a viable side frame exists |
| Content or controls resize after first render | Medium | Observe all three elements and deduplicate normalized frame updates |
| Short landscape inherits width-only layout | High | Combine width, height, and orientation conditions |
| Full-hero Canvas intercepts content interaction | High | Keep HTML above the Canvas and scope pointer interaction to the stage region |
| Removing the selector remounts the current Prism | Medium | Rewrite in place with one persistent semantic subtree and regression test |

## Boundaries

### Always

- Preserve one semantic hero subtree and one Canvas.
- Keep `PrismState` literal: Idea, Iterate, Solution.
- Use semantic tokens and existing UI primitives.
- Keep HTML content readable without relying on the Canvas.
- Preserve native document scrolling.

### Not in this plan

- Scroll-driven discovery or hero/application modes.
- Glass application surface and `NavigationPanel` timing.
- Ambient/demand rendering.
- Final portfolio copy or contact behavior.
- Removing `HeroControlPanel` from its independent showcase.
- Adding a layout, measurement, or animation dependency.
- Enabling OrbitControls panning; the derived frame defines home/recenter
  composition and is not a movement constraint.
- Absolutely positioning the editorial content in two-column mode; it remains
  in grid flow above the full-hero Canvas.

### Ask first

- Change the two action roles.
- Expose raw camera values through the Prism API.
- Replace OrbitControls.
- Integrate the hero into the final portfolio route.
