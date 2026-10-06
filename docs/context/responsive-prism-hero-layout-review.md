# Responsive Prism Hero Layout Review

## Status

Approved direction from the project-owner review on 2026-09-27. This document
supersedes conflicting content-density, three-column comparison, and initial
framing guidance in `responsive-prism-hero-spec.md`. The scroll and application
handoff requirements in that specification remain unchanged.

## Editorial contract

The hero is one compact editorial unit rather than stable copy followed by a
second state-content card.

- Use a short stable title that can remain on one line at target widths.
- Use the active state's description as the hero description at every
  breakpoint.
- Use a one-line state tagline at every breakpoint.
- Place the visible state description before the action group.
- Use one-word action labels so both actions remain side by side.
- Use compact visual sizing while retaining at least a 44 px touch target.

Provisional review copy:

| State | Tagline | Description |
|---|---|---|
| Idea | Find the right problem. | Align user needs, business goals, and technical reality. |
| Iterate | Make uncertainty testable. | Test working ideas early and refine what matters. |
| Solution | Ship with confidence. | Deliver a coherent product built to evolve. |

Provisional actions:

- Primary: **Work**
- Secondary: **Contact**

## Responsive disclosure

| Layout condition | Visible editorial content |
|---|---|
| Phone portrait | centered identity, one-line title, state tagline, state description, and both actions |
| Short phone landscape | the same full-Canvas editorial and controls used in portrait |
| Tablet portrait | centered editorial and controls over the full-viewport Prism Canvas |
| Tablet landscape | tablet content in an equal split |
| Desktop and wide desktop | the same editorial content as tablet with an equal two-column composition |

No breakpoint adds decorative copy merely to fill space. Desktop uses one
two-column direction; the three-column candidate and its lab selector are
retired.

### Small-screen and tablet-portrait composition

Small portrait and landscape screens, plus tablet portrait, use one
full-viewport Canvas behind independently positioned HTML overlays:

```text
top-aligned editorial overlay
┌─────────────────────────────┐
│ full 100dvw × 100dvh Canvas │
│                             │
│  5% ┌───────────────────┐   │ 40dvh
│     │ Prism home frame  │   │
│     └───────────────────┘   │ 90dvh
│ bottom control overlay      │
└─────────────────────────────┘
```

Hero content is positioned from the top and controls from the bottom. Their
rendered bounds define the Prism home frame with horizontal gutters and a
clearance gap, so its initial framing uses the available space between the two
overlays. The full Canvas remains available when the user pans or zooms.

Tablet landscape switches to a content-left/stage-right split at
`md:landscape`; desktop uses the same equal split from `lg` regardless of
orientation.

## Stage controls

Hero stage controls contain only three compact regions:

1. independent playback and recenter actions;
2. autoplay progress;
3. semantic state selector: Idea, Iterate, Solution.

Playback and recentering keep stable positions and independent meanings before
and after camera exploration. Portfolio actions do not belong inside the stage
controls.

In tablet landscape and desktop two-column compositions, the control surface
sits beneath the Prism and aligns to the stage's right edge. The editorial
column spans the Prism and control rows and centers vertically against their
combined height.

## Layout and Three.js framing boundary

The Canvas remains capable of filling the hero, while HTML layout defines an
empty home frame describing the Prism's initial and recentered presentation.

```text
full hero / Canvas
┌──────────────────────┬──────────────────────────────┐
│ editorial content    │ measured home frame          │
│                      │ ┌──────────────────────────┐ │
│                      │ │ projected Prism         │ │
│                      │ └──────────────────────────┘ │
└──────────────────────┴──────────────────────────────┘
```

The UI-to-Stage value is a normalized rectangle with a top-left origin:

```ts
interface PrismHomeFrame {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}
```

Every value is clamped to `0–1`. The frame is a home pose, not a clipping or
interaction boundary. This is layout geometry, not camera state.
UI code does not provide camera coordinates, field of view, object scale, or
Three.js objects.

Ownership remains explicit:

- HTML/CSS owns content flow and positions the top hero and bottom controls.
- A measurement adapter derives the available home region from those rendered
  boundaries with 5% horizontal gutters, `1rem` clearance, and an `11rem`
  minimum height.
- Only surfaces that physically occlude the Canvas constrain the frame, so
  side-by-side layouts retain the existing centered Stage view without reading
  `window.innerWidth`.
- The Stage owns the Prism's stable optical bounds, camera fit, projection
  offset, and interaction target. Its fitted view reserves 10% of the measured
  frame, so projected Prism bounds use at most 90% of the available width and
  height.
- Fitting uses both frame width and height and preserves uniform object scale.
- The optical center is stable across Idea, Iterate, and Solution transitions;
  it is not recomputed per animation frame.
- Later scroll discovery may move the camera away from this home view across
  the entire Canvas. The home frame is reapplied only when recentering.

## Review targets

- 375 px phone portrait;
- short phone landscape;
- 768 px tablet portrait;
- tablet landscape;
- 1024 px compact desktop;
- 1440 px wide desktop.

The layout is accepted only when the Prism remains meaningful above the fold,
the two actions remain side by side, text respects the disclosure rules, stage
controls remain compact, and the Prism is optically centered inside its frame
without geometry distortion.
