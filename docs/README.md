# Project Knowledge

This directory stores durable knowledge that future contributors cannot reliably infer from code, tests, or Git history. It does not store task progress.

- `decisions/`: significant technical decisions and trade-offs. Use sequential ADR filenames such as `0001-example-decision.md`; supersede old records instead of deleting them.
- `domain/`: business terminology, rules, policies, and invariants.
- `contracts/`: stable API, event, schema, and integration contracts when code or an authoritative schema is not already the better source.
- `context/`: non-obvious subsystem context, operational assumptions, and known constraints.

## Current subsystem context

- [`context/global-theme-and-prism-appearance.md`](context/global-theme-and-prism-appearance.md):
  HTML-owned theme state, global setters/reading hook, and mode-adaptive Prism
  backing and figure lighting.

- [`context/prism-portrait-spread-spec.md`](context/prism-portrait-spread-spec.md):
  centered portrait hero with vertical spread capped from square Prism home height.

- [`context/prism-desktop-zoom-centering-spec.md`](context/prism-desktop-zoom-centering-spec.md):
  desktop discovery projection, full-progress centering, and responsive verification contract.

- [`context/prism-fiber-architecture.md`](context/prism-fiber-architecture.md):
  scene graph, architectural layers, utility responsibilities, state and
  transition ownership, and current deferred integration work.
- [`context/responsive-prism-hero-spec.md`](context/responsive-prism-hero-spec.md):
  broader responsive hero, Prism discovery, and glass-application handoff
  contract.
- [`context/responsive-prism-hero-layout-review.md`](context/responsive-prism-hero-layout-review.md):
  authoritative compact content, unified responsive layout, controls, and
  DOM-to-Three.js composition-frame decisions.
- [`context/prism-hero-scroll-zoom-glass-lab-spec.md`](context/prism-hero-scroll-zoom-glass-lab-spec.md):
  implemented contract for the complete Prism hero using native scroll for
  camera zoom followed by a flow-driven decorative glass overlay.

Create a directory only when its first real document is needed. Keep temporary plans, evidence, reviews, and handoffs in the root-level, locally ignored `local-workspace/`.
