# 4. Retain the navigation panel's inset reveal

- Status: accepted
- Date: 2026-09-22
- Supersedes: [ADR 0003](0003-navigation-panel-motion.md)

## Context

The navigation panel opens and closes frequently on devices with varying CPU
and graphics capability. Its reveal animates an inset clip path while the card
remains fully laid out above the launcher.

A uniform bottom-origin scale was evaluated as a potentially cheaper transform
animation. In review it performed less well for this panel and made the entire
card, including its text and controls, grow and shrink during the transition.

The interaction no longer needs animation completion to control focus or
interactivity. Logical open state owns those behaviors, while one reversible
Motion value remains responsible for the visual transition.

## Decision

Retain the inset clip-path reveal. Drive it directly from the existing progress
value, with `0` fully clipped and `1` fully visible. Keep the panel positioned
from its bottom edge so the visible area grows upward without scaling content.

Keep opening and closing logic independent of animation completion. An
interrupted transition stops its current tween and begins the opposite tween
from the Motion value's current position. Reduced motion jumps directly to the
requested endpoint.

## Consequences

Text and interactive content remain at their natural size during the reveal,
and the reviewed behavior is better than the uniform-scale alternative for this
panel. The browser may perform clipping or painting work during animation, so
future changes should compare measured results rather than assuming a transform
will be faster for this composition.

The panel stays bottom-anchored, and switching tabs still changes its intrinsic
height without animation.
