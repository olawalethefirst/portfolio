# Project Knowledge

This directory stores durable knowledge that future contributors cannot reliably infer from code, tests, or Git history. It does not store task progress.

- `decisions/`: significant technical decisions and trade-offs. Use sequential ADR filenames such as `0001-example-decision.md`; supersede old records instead of deleting them.
- `domain/`: business terminology, rules, policies, and invariants.
- `contracts/`: stable API, event, schema, and integration contracts when code or an authoritative schema is not already the better source.
- `context/`: non-obvious subsystem context, operational assumptions, and known constraints.

## Current subsystem context

- [`context/publication-table-of-contents.md`](context/publication-table-of-contents.md):
  article heading IDs, responsive contents navigation and native fragment links.

- [`context/markdown-field.md`](context/markdown-field.md):
  reusable Markdown field, selection behavior, restricted rendering and comment integration.

- [`context/field-and-button-icon-policy.md`](context/field-and-button-icon-policy.md):
  planning comparisons for inputs and buttons, with icon-free defaults for textareas and ghost buttons.

- [`context/perspective-grid-section.md`](context/perspective-grid-section.md):
  shared decorative background, opacity defaults, and consumer layout ownership.

- [`context/section-heading-spec.md`](context/section-heading-spec.md):
  shared outline section heading contract, adjustable defaults, and preview acceptance.

- [`context/section-container-contract.md`](context/section-container-contract.md):
  shared responsive content widths, horizontal gutters, and hero safe-area handling.

- [`context/global-theme-and-prism-appearance.md`](context/global-theme-and-prism-appearance.md):
  HTML-owned theme state, global setters/reading hook, and mode-adaptive Prism
  backing and figure lighting.

- [`context/prism-portrait-spread-spec.md`](context/prism-portrait-spread-spec.md):
  CSS-centered portrait hero with a shrinkable 25:27 Prism slot and measured camera framing.

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

## Third-party assets

Contact social marks use local GitHub, LinkedIn, and Twitter X paths from
[Bootstrap Icons](https://icons.getbootstrap.com/), with a shared 16×16 viewBox
and inherited accent color. The [MIT license](licenses/bootstrap-icons.txt)
is retained with the vendored paths in `src/components/contact-conversation/social-icons.ts`.
