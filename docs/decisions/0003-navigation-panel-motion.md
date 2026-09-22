# 3. Drive navigation panel motion from one reversible progress value

- Status: superseded by [ADR 0004](0004-retain-navigation-panel-clip-reveal.md)
- Date: 2026-09-20

## Context

The floating navigation control must transition between a two-button pill and a
close control while a panel opens above it. The pill and close control need an
intentional overlap, the panel must reveal from bottom to top, and switching
between navigation and settings must change panel height at its top edge. Every
transition must reverse cleanly from its current position and respect reduced
motion.

Independent CSS transitions or separately delayed component animations make the
forward sequence straightforward but make interruption and reversal fragile.
Animating explicit pill widths would also duplicate dimensions already owned by
the composed controls, while scaling the panel itself would visibly distort its
text and interactive content.

## Decision

Use Motion for React and keep one master `MotionValue<number>` whose endpoints
are `0` for closed and `1` for open.

The navigation pill and close control remain mounted in the same centered grid
cell. Uniform scale and opacity are derived from overlapping sections of the
master value: the pill reaches zero at progress `0.6`, while the close control
begins growing at `0.4`. Uniform scale preserves each control's proportions; it
does not use independent X or Y scaling.

Panel progress is derived from the master range `0.2..1` and mapped to a CSS Grid
track from `0fr` to `1fr`. The grid's child has `min-height: 0` and clipped
overflow, allowing intrinsic content to remain mounted without vertically
scaling it. The panel is positioned from its bottom edge, so opening, closing,
and intrinsic size changes move its top edge.

Logical state retains both `isOpen` and the last selected view. Visual phase is
separate and exists only to manage interactivity and focus at animation
endpoints. Starting the opposite animation stops the previous playback and
continues from the current master value; a run identifier prevents stale
completion callbacks from changing phase or focus.

Opening uses an ease-out curve so the panel responds immediately and settles at
full size. Closing uses a symmetric ease-in-out curve so contraction remains
visible through the timeline instead of front-loading almost all size change
into the first frames.

When the operating system requests reduced motion, the master value jumps to
its endpoint and layout-size animation is disabled. Semantic state, dismissal,
and focus behavior remain identical.

## Consequences

The complete interaction has one reversible source of visual truth and contains
no timer that attempts to predict animation completion. Control dimensions stay
intrinsic, both controls remain available to Motion for interruption, and only
the endpoint selected by visual phase is exposed to interaction or assistive
technology.

The scale swap retains the larger pill's layout footprint even when the close
control is visible. This is acceptable because the control is fixed, centered,
and removed from document flow. The panel uses a real grid-track size animation,
which can require layout work, but its absolute positioning isolates that work
from page layout and avoids distorted content.

Motion adds client-side JavaScript to this interactive boundary. The animation
primitives remain internal rather than expanding the design-system API. If
browser review finds visible distortion in Motion's layout-size handling during
navigation/settings changes, only that height-change path should move to an
explicit measured-height implementation; the master-progress contract remains
unchanged.
