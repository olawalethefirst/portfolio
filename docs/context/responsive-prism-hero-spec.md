# Responsive Prism Hero Specification

## Status

Approved by the project owner on 2026-09-24. This document specifies the
responsive hero prototype and its transition into a representative application
surface. Implementation remains gated on approval of the technical plan.

The approved 2026-09-27 layout review supersedes conflicting content-density,
three-column comparison, and initial framing guidance in this document:

- [`responsive-prism-hero-layout-review.md`](responsive-prism-hero-layout-review.md)

Related subsystem context:

- [`prism-fiber-architecture.md`](prism-fiber-architecture.md) defines the
  existing Prism scene, Stage, semantic state, and transition ownership.

## Objective

Create an immersive, responsive portfolio hero that presents product delivery
as a joint story between editorial content and the interactive Prism. The hero
must keep the Prism meaningfully visible above the fold on every supported
viewport while preserving readable content, direct state controls, and a clear
path into the portfolio.

The hero is the persistent visual foundation of the application:

1. The initial `100dvh` view presents the complete hero without global
   navigation.
2. Native page scroll moves the camera toward the Prism and reveals that the
   apparently isolated 3D object occupies a full-hero Canvas.
3. Non-Prism hero content withdraws in a coordinated handoff.
4. A glass application surface rises from below the viewport.
5. The Prism becomes an ambient, non-interactive background beneath the
   application.
6. The existing floating `NavigationPanel` appears only after application mode
   is established.
7. Reversing scroll restores the complete interactive hero.

The immediate deliverable is a dedicated lab prototype of the single approved
responsive composition under identical content, Prism state, theme, and
viewport conditions.

### Audience

The hero primarily addresses:

- product teams and hiring managers evaluating ownership and delivery ability;
- prospective clients evaluating whether the portfolio owner can take a
  product from idea to a shipped outcome.

### Positioning

The stable message emphasizes end-to-end product delivery. Final copy is out
of scope for the prototype. Realistic placeholder text must be used so line
length, wrapping, hierarchy, and breakpoint density can be evaluated.

### Primary actions

- Primary: **View selected work**
- Secondary: **Start a conversation**

The labels are provisional content but define the two distinct action roles.

## Scope

### In scope

- responsive hero composition for phone, tablet, desktop, and wide desktop;
- phone-landscape handling as a height-constrained layout;
- one expanding two-column desktop composition;
- responsive Prism camera framing without geometry distortion;
- semantic Idea, Iterate, and Solution state selection;
- autoplay progress, pause/play, and recenter controls;
- state-dependent hero narrative on desktop;
- fully reversible native-scroll discovery and application handoff;
- representative glass application surface;
- hero-to-application `NavigationPanel` visibility behavior;
- theme and light/dark mode responsiveness;
- reduced-motion, reduced-transparency, keyboard, touch, and WebGL fallbacks;
- behavior-focused tests and documented manual review criteria.

### Out of scope

- final portfolio copy;
- final case-study or portfolio-section design;
- production navigation information architecture;
- final contact flow;
- changes to the internal Idea, Iterate, and Solution 3D compositions;
- new 3D assets;
- a production analytics or engagement implementation;
- selecting the final desktop layout before both variants are reviewed;
- adding a new animation, scroll, or layout dependency without approval.

## Experience principles

### Prism-led identity

The Prism is the principal visual expression. Typography, narrative, controls,
and calls to action frame it; they do not compete with it through decorative
cards or excessive effects.

### Structured first, spatial second

The Canvas fills the hero from the beginning, but the visible Prism must appear
contained within a predictable, breakpoint-specific composition region.
Overlap is discovered through scroll-driven camera movement rather than shown
in the initial frame.

### Meaning and control are separate

Hero content owns the active state's meaning. Stage controls own interaction
and playback status. A control surface must not become a content card.

### Persistent does not mean continuously dominant

The live Prism is interactive and prominent in hero mode. In application mode,
it becomes ambient, visually subordinate, and non-interactive. It must not
compete with portfolio reading or consume full interactive rendering resources
without purpose.

### Native scroll remains authoritative

The browser owns page scrolling. The experience reads scroll position; it does
not capture wheel events, create a nested scrolling region, or require the
visitor to finish an animation before continuing.

### Restrained editorial spatial tone

The visual language uses strong typography, generous negative space, and
glass only where it communicates control or application layering. The Prism,
not ornamental UI, supplies most of the visual complexity.

## Content model

### Stable hero content

Stable content does not change with Prism state:

- compact identity label;
- end-to-end product-delivery headline;
- supporting description where the breakpoint permits it;
- primary and secondary calls to action where the breakpoint permits them;
- subtle scroll cue.

There is no conventional page header in the hero.

### State narrative

The desktop hero includes narrative content synchronized to the semantic Prism
state:

```ts
type PrismHeroNarrative = Record<
  PrismState,
  {
    indexLabel: string;
    heading: string;
    description: string;
  }
>;
```

The content is provisional in the lab, but it must use realistic lengths:

- `indexLabel`: short, such as `01 / Idea`;
- `heading`: approximately two to five words;
- `description`: one concise paragraph, targeted at roughly two to four lines
  in its intended desktop column.

The UI-owned semantic `PrismState` drives both the narrative and the existing
`<Prism state={state} />`. Narrative content does not enter the Three.js scene.

### Responsive disclosure

| Layout condition | Required visible content above the fold |
|---|---|
| Phone portrait | identity, short positioning, Prism, compact state control, primary CTA, scroll cue |
| Short phone landscape | compact identity and primary CTA, Prism, condensed state control, scroll cue |
| Tablet portrait | phone core plus supporting description and secondary CTA |
| Tablet landscape | tablet content in an asymmetric split composition |
| Desktop | stable hero content plus active-state process narrative and bookended stage controls |
| Wide desktop | same information as desktop with more breathing room; no extra content solely to fill space |

The same core message must remain understandable at every size even when
supporting detail is withheld.

## Responsive layout system

The labels below describe behavior, not device detection. Implementation should
combine width, height, and orientation queries so short viewports do not inherit
layouts that only fit tall screens.

Initial review targets are:

- 375 px phone portrait;
- a short phone landscape viewport;
- 768 px tablet portrait;
- tablet landscape;
- 1024 px desktop or compact laptop;
- 1440 px wide desktop.

Exact media-query thresholds are an implementation decision, but they must map
to these composition changes and remain consistent with the project's existing
responsive conventions.

### Phone portrait: three-zone stack

```text
┌────────────────────────────┐
│ Identity + short position  │
│ Primary CTA                │
├────────────────────────────┤
│                            │
│           PRISM            │
│                            │
├────────────────────────────┤
│ Combined compact controls  │
│ Subtle scroll cue          │
└────────────────────────────┘
```

Requirements:

- The Prism occupies the dominant middle zone.
- Text remains concise enough to avoid forcing the Prism below the fold.
- The combined control rail sits below the Prism rather than over its primary
  visual details.
- The primary CTA remains visible; the secondary CTA may be omitted.
- Touch controls preserve at least a 44 px comfortable target and 8 px spacing.
- Safe-area padding prevents controls and the cue from colliding with browser
  or device chrome.

### Short phone landscape: compact split

```text
┌──────────────────┬─────────────────────────┐
│ Compact identity │                         │
│ Short position   │          PRISM          │
│ Primary CTA      │                         │
└──────────────────┴─────────────────────────┘
             Condensed control rail
```

Requirements:

- The layout switches because of limited height, not merely width.
- Identity and primary action occupy the left region; Prism occupies the right.
- Supporting copy and secondary CTA are withheld.
- The control rail must not force horizontal page scrolling.

### Tablet portrait: expanded three-zone stack

The phone stack gains supporting description and a secondary CTA. The Prism
remains the dominant middle region and controls remain combined beneath it.

### Tablet landscape: asymmetric split

The stable hero content occupies the smaller side of the split and the Prism
occupies the larger side. Controls may remain combined unless height permits
the desktop bookended treatment without reducing the Prism below its portrait
prominence.

The prototype review determines the exact crossover. No layout may switch to
bookended controls solely because width increased while available height is
insufficient.

### Desktop candidate A: two-column narrative

```text
┌─────────────────────────┬─────────────────────────────────┐
│ Identity                │ Playback progress + action      │
│ Delivery headline       │                                 │
│ Supporting description  │              PRISM              │
│ CTA group               │                                 │
│                         │ Idea | Iterate | Solution       │
│ Active-state narrative  │                                 │
└─────────────────────────┴─────────────────────────────────┘
```

Requirements:

- Begin evaluation near a `5 / 7` or `4.5 / 7.5` text-to-stage ratio.
- The Prism receives the larger uninterrupted region.
- Stable copy, calls to action, and active-state narrative form one coherent
  editorial column.
- The narrative block reserves enough height for every state so autoplay does
  not move the surrounding layout.
- The selector remains spatially associated with the Prism, not embedded in the
  narrative column.

Expected advantage: stronger causal grouping and a natural progression from
tablet landscape into compact desktop.

Primary risk: excessive text density in the editorial column.

### Desktop candidate B: three-column editorial stage

```text
┌──────────────────┬───────────────────────────┬──────────────────┐
│ Identity         │ Playback progress/action  │ Active-state     │
│ Delivery headline│                           │ narrative        │
│ Supporting copy  │           PRISM           │                  │
│ CTA group        │                           │                  │
│                  │ Idea | Iterate | Solution │                  │
└──────────────────┴───────────────────────────┴──────────────────┘
```

Requirements:

- The Prism occupies the central and visually dominant region.
- Stable identity remains left and state-dependent narrative remains right.
- The controls stay with the Prism stage.
- The layout must not read as a dashboard or reduce the Prism to accommodate
  three narrow columns.
- At 1024 px, the variant must remain readable without relying on the wide
  desktop layout.

Expected advantage: an exhibition-like composition with a literal central
stage.

Primary risks: fragmented attention, narrow text measures, and reduced Prism
scale at common laptop widths.

### Wide desktop

Wide layouts increase negative space and Prism scale within safe framing. They
must not add secondary statistics, badges, or decorative content merely to fill
space. Candidate B may prove more effective only at this range; using different
approved desktop compositions at compact and wide widths remains acceptable.

## Prism framing and overlap discovery

### Initial framing

The Canvas fills the entire hero and sits behind HTML content. The visible
Prism occupies a virtual composition region established through camera
distance, camera target, and scene positioning.

Initial framing must:

- preserve the Prism's existing geometry proportions;
- keep the object predictably isolated from sibling content;
- avoid text or button overlap at every target viewport;
- reserve enough camera range for a visible scroll-driven discovery;
- use uniform scene scale only if scale is required.

Nonuniform object scaling is prohibited.

### Discovered framing

Scroll moves the camera toward an art-directed endpoint. At that endpoint:

- the Prism may extend beyond its initial virtual region;
- it may pass behind the peripheral edges of large hero typography or UI;
- dense copy and button labels remain readable;
- the object remains recognizable rather than becoming an arbitrary crop;
- responsive camera endpoints may differ by layout condition.

The overlap must feel newly discovered. It must not be clearly present in the
initial static frame.

## Stage controls

### Control responsibilities

Stage controls contain only:

- Idea, Iterate, and Solution state selection;
- autoplay progress;
- play/pause action;
- recenter action after camera interaction.

They do not contain explanatory state copy or portfolio calls to action.
Direct rotation has no instructional label; it is deliberately discovered
through manipulation, while the named state controls remain the explicit
non-drag path through every meaningful Prism state.

### Combined compact controls

Phone portrait and tablet portrait use a unified control region beneath the
Prism:

```text
[ Idea | Iterate | Solution ]
[ progress ───────── play/pause or recenter ]
```

The composition may share one glass surface or use visually connected glass
segments, provided the selected state, progress, and action remain legible.

### Bookended desktop controls

Desktop stage controls surround rather than cover the Prism:

```text
[ progress ───────────────────── play/pause or recenter ]

                         PRISM

[           Idea | Iterate | Solution                    ]
```

Requirements:

- Glass reveals the Prism beneath while preserving control contrast.
- Progress and its pause action remain visibly associated.
- Recenter replaces the playback action only after manual camera exploration,
  preserving the existing semantic behavior.
- The selector uses named states, not numeric progress or raw angles.
- Visual placement and DOM tab order remain logical and consistent.

### Autoplay behavior

- Autoplay cycles through Idea, Iterate, and Solution using the existing UI
  timer contract.
- State changes update the Prism and visible state narrative together.
- Focus entering the auto-changing hero experience pauses autoplay.
- Pointer hover over the changing narrative or controls pauses autoplay where
  hover is available.
- `prefers-reduced-motion` disables autoplay movement and presents a stable
  initial state.
- Manual pause remains authoritative across mode changes.
- If application mode only suspended a running autoplay session, returning to
  the fully restored hero may resume it.
- Rapid manual state changes cancel and replace in-flight UI and scene
  transitions without waiting for an animation-end event.

## Scroll and mode-transition contract

### Modes

| Mode | Prism | Hero content | Application surface | NavigationPanel |
|---|---|---|---|---|
| Hero | prominent, interactive, normal render quality | fully visible | below viewport | hidden |
| Discovery | camera moves toward endpoint; drag remains available if it does not block vertical scroll | initially visible | below viewport | hidden |
| Handoff | final discovered framing; interaction is withdrawn | exits toward layout edges | begins rising | hidden |
| Application | ambient, non-interactive, reduced render activity | hidden and inert | primary reading surface | visible |

### Forward sequence

The sequence uses a sticky or fixed full-height hero plus normal document
scroll distance. Exact distances require browser prototyping, but ordering is a
contract:

1. The scroll cue disappears after meaningful downward movement.
2. Camera discovery completes before the application surface meaningfully
   enters the viewport.
3. Hero content starts withdrawing just before the surface arrives.
4. The application surface travels from below the viewport to its established
   top position.
5. The Prism enters ambient mode as the application surface takes ownership.
6. The `NavigationPanel` appears only after application mode is established.
7. Continued scrolling uses normal document flow through application content.

The intended starting estimate for prototype tuning is:

- camera discovery over approximately `30–40dvh` of scroll distance;
- content withdrawal overlapping the end of discovery and beginning of the
  application entrance;
- application entrance tracking approximately one viewport of scroll distance
  so its movement remains understandable;
- no prolonged cinematic runway before selected work becomes reachable.

These values are tuning inputs, not public API constants.

### Content withdrawal

- Two-column desktop: editorial content withdraws toward its nearest outer
  edge; top utility controls move subtly upward; selector moves subtly down.
- Three-column desktop: left content exits left, right narrative exits right,
  and stage controls separate vertically.
- Phone portrait and tablet portrait: upper content withdraws upward and the
  combined controls withdraw downward.
- Landscape split layouts: text exits toward its side and controls toward the
  nearest unobstructed edge.

Opacity and short transforms are secondary to the camera movement. The hero
must not animate every child independently.

Once fully hidden, hero controls and links become non-interactive and are
removed from sequential keyboard navigation. They must not remain invisible
focus targets beneath the application surface.

### Reverse sequence

Upward scrolling reverses the same spatial relationships:

1. `NavigationPanel` hides before the application surface descends.
2. The surface lowers.
3. Hero content returns from its layout-specific edges.
4. The camera returns to its initial breakpoint framing.
5. Prism interaction is restored.
6. Autoplay resumes only if it was running before application-mode suspension
   and the user has not manually paused it.

Transitions are driven from current progress and must tolerate rapid direction
changes without snapping to stale endpoints.

### Scroll ownership

- Wheel input scrolls the page; OrbitControls wheel zoom is disabled.
- Vertical touch movement scrolls the page and is not trapped by the Canvas.
- Pointer drag may rotate the Prism in hero mode where it does not prevent the
  standard page-scroll gesture.
- Named state controls provide a non-drag way to explore all meaningful Prism
  presentations.
- The primary CTA advances to selected work using the same document position
  as natural scrolling rather than running a separate transition system.

### Reduced motion

With `prefers-reduced-motion: reduce`:

- no scroll-scrubbed camera motion runs;
- no parallax or independently staggered content exit runs;
- the page presents the hero and application surface in normal document flow;
- mode state still changes correctly as content becomes active;
- the Prism presents a stable semantic state;
- controls remain usable and final content remains readable.

The preference must be observed reactively if it changes during the session.

## Application surface and ambient Prism

### Glass surface

The representative application surface establishes a dependable reading plane.
It may reveal atmosphere and the Prism silhouette but must not rely on blur
alone for contrast.

Requirements:

- use existing semantic theme tokens;
- use the existing glass-material strategy where suitable;
- provide sufficient tint or opacity for text contrast over every Prism state;
- reserve one backdrop-filter owner rather than stacking full blur effects;
- use more opaque nested surfaces for dense reading where required;
- support `prefers-reduced-transparency` with an opaque surface;
- avoid horizontal overflow and nested page scrolling;
- preserve visible keyboard focus above fixed navigation.

The final horizontal inset and leading-edge radius are art-direction questions
for prototype review.

### Ambient Prism

In application mode:

- autoplay is suspended;
- OrbitControls and direct pointer interaction are disabled;
- the Prism is visually de-emphasized through art-directed contrast,
  saturation, opacity, lighting, or a combination of those properties;
- the scene is frozen or rendered on demand when no meaningful motion remains;
- the selected Prism state is preserved;
- the Canvas remains an environmental layer and is hidden from assistive
  technology when it conveys no additional application content.

The application surface, not the background Prism, owns pointer and keyboard
interaction.

## Theme behavior

The hero participates in all existing accent themes and light/dark modes.

- Typography, focus, control surfaces, progress, and atmosphere use semantic
  tokens rather than hard-coded theme colors.
- Prism assets preserve their intended material appearance.
- Light and dark modes are evaluated independently for glass contrast.
- Changing the theme in application mode updates the ambient hero beneath it.
- Returning to the hero shows the selected theme without a second transition
  or remount of the 3D scene.

## Lab comparison experience

The lab provides one accessible selector with:

- **Two columns**
- **Three columns**

The selector is comparison tooling, not final hero UI. Switching layout must:

- preserve current semantic Prism state;
- preserve autoplay intent;
- preserve selected theme and mode;
- reset scroll to a comparable initial hero position or clearly indicate that
  comparison is occurring at the current transition progress;
- avoid remounting or duplicating the WebGL Canvas where practical;
- expose selected layout semantically and support keyboard operation.

Both candidates use identical placeholder copy, controls, camera-size target,
theme, actions, and scroll contract. Only composition changes. This prevents a
more favorable content or camera setup from biasing layout selection.

### Comparison criteria

Review both layouts at 1024 px and 1440 px for:

1. Prism dominance and recognizable scale;
2. first-scan clarity;
3. relationship between state narrative, controls, and Prism response;
4. text measure and wrapping;
5. empty-space quality;
6. control discoverability;
7. initial isolation and scroll-revealed overlap;
8. content-exit coherence;
9. transition into the glass application surface;
10. resilience to 125% text scaling.

The final selection may choose candidate A for compact desktop and candidate B
for wide desktop if each is demonstrably stronger in its range.

## Accessibility requirements

- All interactive controls are keyboard operable with visible focus.
- Visual and DOM order remain logically aligned at every breakpoint.
- Normal text maintains at least 4.5:1 contrast against its effective rendered
  background; large text maintains at least 3:1.
- Selected Prism state is expressed through text and semantic selection state,
  not color alone.
- Icon-only controls retain explicit accessible names.
- Touch targets are at least 44 by 44 CSS pixels where practical and separated
  sufficiently to prevent accidental activation.
- Auto-changing content has an adjacent pause mechanism and stops for reduced
  motion, relevant focus, and relevant hover.
- Hidden hero content cannot receive focus in application mode.
- The full experience remains understandable without drag interaction.
- The WebGL fallback communicates that the Prism cannot render while leaving
  the portfolio entry action available.
- Focus is never obscured by the fixed `NavigationPanel` or viewport edges.
- Browser zoom and text scaling do not truncate essential labels or remove the
  primary CTA.

## Performance classification

Performance risk is **possible** because the design combines:

- a persistent WebGL Canvas;
- scroll-linked camera updates;
- full-surface transparency and backdrop filtering;
- fixed or sticky layers;
- responsive layout transitions.

### Non-regression criterion

On the same test device, browser, viewport, theme, and Prism state, record the
current `/prism-fiber-lab` frame profile as the baseline before implementation.
During the completed hero handoff:

- 95th-percentile frame time must not regress by more than 25% relative to that
  baseline;
- no continuous render loop may remain active in settled application mode when
  the ambient Prism and UI are static;
- no single scroll-linked handler may cause repeated long tasks above 50 ms;
- application entry must not introduce visible layout shift in already visible
  hero content.

If browser tooling cannot produce comparable numbers, the controller must
record the limitation and obtain approval for a replacement measurement before
acceptance. Visual smoothness alone is not the measurement.

## Tech stack

- Next.js `16.3.4`
- React `19.2.8`
- TypeScript
- Tailwind CSS `4`
- HeroUI `3.2.5`
- React Three Fiber `9.8.0`
- Drei `10.7.8`
- Three.js `0.159.0`
- Motion `13.4.0`
- Vitest `5.0.1`
- Testing Library

No additional animation or scroll dependency is assumed. Existing Motion and
React Three Fiber capabilities should be evaluated first. Adding a dependency
requires explicit approval and an explanation of what existing tools cannot
provide cleanly.

## Commands

Commands permitted to an implementation agent under `CONSTRAINTS.md`:

```sh
pnpm exec vitest run <affected-test-paths>
pnpm exec tsc --noEmit
git ls-files --cached --others --exclude-standard -z -- '*.js' '*.jsx' '*.mjs' '*.ts' '*.tsx' | xargs -0 pnpm exec eslint --
git diff --check
```

Human-controller verification unless explicitly delegated:

```sh
pnpm dev
pnpm build
```

The agent must not start the server, run the production build, or perform
browser verification without explicit delegation.

## Expected project structure

The implementation plan may refine filenames, but responsibility should remain
within these boundaries:

```text
app/
  prism-fiber-lab/                  comparison page and metadata
src/components/
  prism-fiber/
    Prism.tsx                       stable reusable facade
    stage/                          Canvas, camera rig, lights, OrbitControls
    scene/                          Prism construction and semantic transitions
    state/                          Idea/Iterate/Solution contracts
    ui/                             hero orchestration and autoplay
  ui/
    hero/                           responsive hero content and control variants
    navigation-panel/               existing application navigation
docs/context/
  responsive-prism-hero-spec.md     this specification
```

The implementation must not move object construction, camera ownership, or UI
state across the established architecture without updating both this document
and the Prism architecture document.

## Code style and interface direction

Use semantic values at React boundaries and keep mutable Three.js details
inside the Stage and Scene layers. Continuous scroll progress is permitted as a
presentation input because it describes camera/handoff position, not the
semantic Prism state.

Illustrative interface direction:

```ts
type HeroLayout = "two-column" | "three-column";
type HeroMode = "hero" | "discovery" | "handoff" | "application";

interface PrismHeroProps {
  comparisonLayout: HeroLayout;
  initialState?: PrismState;
}

interface PrismHeroView {
  mode: HeroMode;
  transitionProgress: number;
}
```

The example defines vocabulary, not a required final API. Implementation should
prefer explicit unions and interfaces over type assertions. It must not expose
OrbitControls, camera objects, Three.js object references, or raw scene angles
to normal UI consumers.

## Testing strategy

### Unit tests

Add focused tests for pure behavior such as:

- scroll progress clamping and mode boundaries;
- fully reversible mode derivation;
- autoplay suspension versus user-authored pause intent;
- responsive control-variant selection if represented in JavaScript rather
  than CSS;
- state-narrative resolution;
- reduced-motion behavior derivation.

### Component tests

Use Testing Library to verify:

- the comparison selector exposes and changes the selected desktop layout;
- semantic Prism state drives both the narrative and Prism facade;
- mobile and desktop control variants preserve accessible names and actions;
- hidden hero controls become non-interactive in application mode;
- `NavigationPanel` visibility follows mode rather than raw pixel checks inside
  the component;
- primary and secondary actions remain semantically available at their intended
  breakpoints;
- reduced-motion mode avoids scroll-driven camera instructions.

Mock the Canvas boundary where a browser WebGL context is not material to the
behavior under test. Do not duplicate Three.js internals in UI tests.

### Manual browser verification

The human controller verifies:

- all target viewport compositions;
- both desktop candidates at 1024 px and 1440 px;
- phone and tablet orientation changes;
- keyboard order and visible focus;
- touch scrolling versus Prism dragging;
- forward, reverse, and rapidly reversed scroll;
- light/dark mode and every accent theme;
- reduced motion and reduced transparency;
- WebGL fallback;
- text scaling to at least 125%;
- contrast over every Prism state;
- performance criteria with browser profiling tools.

No production build or browser verification is delegated to the implementation
agent by this specification.

## Boundaries

### Always

- Preserve the semantic `idea | iterate | solution` public state contract.
- Keep the Prism visible above the fold at every target viewport.
- Use native document scrolling and a reversible progress model.
- Keep final hidden hero controls out of keyboard navigation.
- Respect reduced-motion and reduced-transparency preferences.
- Use existing semantic tokens and UI primitives where they satisfy the design.
- Keep responsive layouts content-driven and resilient to realistic text.
- Add the smallest appropriate behavior tests before or with implementation.
- Run the permitted test, type, lint, and diff checks before handoff.

### Ask first

- Add any dependency.
- Change the established Prism semantic-state API.
- Change final portfolio information architecture.
- Make the 3D scene interactive beneath the application surface.
- Persist layout-comparison tooling in the production hero.
- Replace the existing theme or glass token system.
- Change the `NavigationPanel` public API beyond integration needs.
- Relax a performance or accessibility acceptance criterion.

### Never

- Use nonuniform Prism scaling to solve layout framing.
- Let OrbitControls wheel zoom compete with page scrolling.
- Convey state through color alone.
- Leave invisible focusable hero controls beneath application content.
- force scroll position, trap scrolling, or create a nested page scroller.
- Ignore reduced-motion or reduced-transparency preferences.
- add type assertions where a proper interface or narrowing function can model
  the value.
- weaken `CONSTRAINTS.md`, suppress type/lint failures, or remove tests to make
  the change pass.

## Success criteria

The specification is satisfied when:

1. The first viewport at every target size contains the required content and a
   meaningfully visible Prism without horizontal scrolling.
2. The initial Prism appears structurally isolated from sibling content even
   though its Canvas spans the hero.
3. Scroll reveals the Prism's spatial overlap only after camera discovery.
4. The forward sequence follows camera discovery → coordinated content exit →
   application entrance → natural application scrolling.
5. Upward scroll reverses the sequence without stale animation endpoints.
6. Two- and three-column desktop candidates can be compared in one lab while
   preserving equivalent content, state, theme, and camera scale.
7. Phone and portrait tablet use combined compact controls; approved desktop
   layouts use bookended controls.
8. State narrative and Prism presentation remain synchronized through
   `PrismState`.
9. Hero controls disappear from pointer and keyboard interaction in application
   mode.
10. The Prism becomes ambient, non-interactive, and non-continuously-rendered
    when the application is settled.
11. `NavigationPanel` is absent during the initial hero and available in
    established application mode.
12. Theme changes update both foreground application UI and ambient hero.
13. Reduced-motion and reduced-transparency paths preserve all essential
    content and actions.
14. Unit/component checks, TypeScript, ESLint, and diff checks pass.
15. Human browser review validates responsive, accessibility, visual, and
    performance criteria.

## Open questions for prototype review

These require visual evidence and do not block initial implementation planning:

1. Does the two-column or three-column candidate win at 1024 px?
2. Does a different candidate win at 1440 px, justifying a wide-layout switch?
3. What exact camera endpoint creates discovery without over-cropping the
   Prism at each layout condition?
4. At what tablet-landscape height can bookended controls replace the combined
   rail without shrinking the Prism?
5. Should the glass application surface be horizontally full-bleed or slightly
   inset on desktop?
6. What leading-edge radius best communicates a surface entering the scene
   without resembling a modal sheet?
7. What tint and blur balance preserves the ambient Prism while meeting text
   contrast and performance requirements in every theme?
