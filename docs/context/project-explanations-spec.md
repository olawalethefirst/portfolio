# Project What / How popovers

This document defines the product and interaction contract for project
explanations. HeroUI owns overlay state and dismissal through its default behavior.

## Objective

Help portfolio visitors quickly understand what each product enables and how its
main technical parts work together. Replace discipline labels such as “Design
systems” and “Frontend engineering” with optional, concise explanations that
support the portfolio's focus on delivering complete products.

Visitors should be able to read either answer independently without leaving the
project or opening a full case study.

## Scope

Replace the bottom-left solution chips in ProjectItem with two compact,
tertiary buttons, ordered “What?” then “How?”. Keep the existing project heading,
introductory summary, platform badge, device/screenshot presentation and View
project action. Each pill opens the corresponding answer in a compact popover.

The feature adds no modal, diagram, extra imagery, technology-logo collection,
tabs, development timeline, analytics integration or new project destination.

## Content

| Answer | Must explain | Avoid |
| --- | --- | --- |
| What | What the product does, who it serves, and its main capabilities | Role descriptions, generic marketing claims, repeating the introductory summary verbatim |
| How | How architecture, frameworks or services combine to provide those capabilities at a high level | An unexplained technology list, implementation minutiae, a narrative of the development process |

Each answer is one plain-text paragraph of 1–3 sentences. Target 25–50 words;
60 words is an editorial ceiling, not a runtime validation or truncation rule.
Use plain language and include technology names only when they clarify a
component's responsibility or relationship to another component.

Illustration only, not factual copy for an existing project:

> What: A B2B payments platform that lets businesses collect customer payments,
> send disbursements, and track transactions from one dashboard.

> How: The dashboard connects to backend payment services that validate requests
> and route transactions through payment providers. Background jobs process
> transfers, while webhooks keep transaction statuses current.

Real project copy must reflect confirmed capabilities and technical details.
Existing Field Notes and Relay entries are demo content; do not infer their
architecture from screenshots or from this payment example. Demo copy can support
implementation, but requires confirmation or replacement before factual publication.

## Presentation

- Both pills occupy the existing solution-chip area and remain visually secondary
  to View project. They retain the shared Button’s blockish corners, visible focus and selected states, and
  at least a 44px-high touch target.
- Popover content consists of a “What” or “How” heading and the answer paragraph.
  Do not add an internal navigation or action row.
- Prefer placement above the selected pill. Target approximately 20rem width;
  constrain it to the viewport with at least 16px horizontal clearance and allow
  collision handling to adjust placement. At narrow widths, it remains a popover.
- Text wraps naturally. At short viewport heights or increased zoom, constrain
  the panel height and allow scrolling without clipping or truncating the answer.
- Use existing semantic surface, border and text tokens in both color modes.
  Opening the panel must not move the project layout. Use HeroUI’s default
  overlay focus and scroll handling.
- Portaled content must escape the project's overflow clipping and stack correctly
  with sticky project articles. Do not leave it above another project's content.
- Any transition respects reduced-motion preferences.

### Icon decision

The controls are text-only. Per the field and button icon policy, the considered
leading Lucide candidates were Info / CircleHelp for “What?” and Workflow / Layers
for “How?”. Info and CircleHelp repeat the question's intent; Workflow and Layers
suggest narrower meanings than the high-level explanation. Omitting icons keeps
both controls compact and equally weighted.

## Interaction contract

Use one uncontrolled HeroUI Popover per pill. Its built-in trigger state,
outside-interaction dismissal, Escape handling, focus management and overlay
layering supply the interaction. Do not add collection-level open state, a custom
outside-click listener, scroll visibility tracking or an overlay coordinator.

- Click, tap, Enter or Space activates the corresponding trigger.
- The selected trigger exposes its expanded state through HeroUI.
- The panel contains only the requested answer.
- Escape and outside interaction dismiss using the library defaults.
- Dismiss the current panel before opening another answer. Do not add custom
  click-through switching behavior or force the library's overlay semantics.
- Unmounting a project also unmounts its popovers.
- Hover alone never opens content.

The default popover uses a transparent dismissal underlay, contains focus and
prevents background scrolling while open. These are library defaults, not a
separate visual modal. Outside activation dismisses the current panel; it does
not also activate the covered control. The answer itself remains scrollable.

Provide project-specific trigger names retaining the visible label, such as
“What? About Relay” and “How? Relay works”. Name each dialog with its project and
answer. HeroUI supplies expanded state and the trigger/panel association. Use
heading level 3 within the project’s existing level-2 heading hierarchy.

## Data and component boundaries

- Project data supplies required `what` and `how` strings alongside its existing
  `summary`. Remove `solutions` from this project's data/props contract after
  updating every caller and fixture. Do not remove the shared Chip component;
  the platform badge still uses it.
- Keep content local to the existing project data source; no API, CMS or fetch is
  needed. Missing production copy is an editorial dependency, not an empty panel.
- Reuse the existing Button wrapper and the installed HeroUI popover primitive.
  Verify the installed primitive's composition, positioning and focus API before
  coding. Preserve the shared Button’s default square corners; do not override its radius.
- Keep device stage identity and animation ownership stable across explanation
  state changes. Opening or switching answers must not remount the stage, reload
  its assets or restart its entry animation.
- The existing collection is in app/PrismHeroLayoutLab.tsx. No collection state
  change is needed: ProjectItem composes its own uncontrolled popovers. Do not
  create a new page to expose the feature.

## Repository context and code conventions

Relevant stack: Next.js 16.3.4, React 19.2.8, TypeScript, HeroUI 3.2.6,
Tailwind CSS 4, Motion and Vitest with Testing Library.

| Location | Responsibility |
| --- | --- |
| src/components/project-item/ProjectItem.tsx | Project layout and explanation integration |
| src/components/project-item/lab-projects.ts | Existing demo project content |
| src/components/project-item/ProjectItem.test.tsx | Existing observable project behavior tests |
| src/components/ui/Button.tsx | Shared button wrapper |
| docs/context/project-explanations-spec.md | Durable feature contract |
| local-workspace/ | Temporary plan, tasks and review evidence |

Follow the existing named-export, typed-prop and semantic utility-class style.
For example, the current project uses:

```tsx
<Chip color="accent" variant="soft">
  {platformLabels[platform]}
</Chip>
```

Keep existing platform rendering and derive explanation content from typed
project fields rather than duplicating strings in JSX. Read relevant installed
Next.js guides under node_modules/next/dist/docs before writing application code.

## Verification

Interaction risk is level 1 under CONSTRAINTS.md: HeroUI owns interaction state
and dismissal. Focused integration tests verify the custom trigger/content wiring
and protect preview continuity; do not duplicate the library’s entire test suite. Use Vitest and Testing Library
beside the relevant component. Assert observable answers, accessible names,
expanded states and focus, rather than class names or internal state shape.

Covered scenarios: each trigger opens the requested answer, the trigger toggles
closed, Escape returns focus to the trigger, and native outside interaction dismisses.
Retain existing preview and live-destination coverage. No numerical coverage
threshold is added.

Commands for the implementation pass:

```sh
pnpm exec vitest run src/components/project-item/ProjectItem.test.tsx
pnpm exec tsc --noEmit
git ls-files --cached --others --exclude-standard -z -- '*.js' '*.jsx' '*.mjs' '*.ts' '*.tsx' | xargs -0 pnpm exec eslint --
```

Include additional focused component/collection test paths as implementation
introduces them. The human controller runs these commands for runtime acceptance,
or explicitly delegates them, as required by CONSTRAINTS.md:

```sh
pnpm build
pnpm dev
```

Browser acceptance covers 320px-wide mobile and desktop layouts, both themes,
touch and keyboard operation, short viewports, 200% zoom, reduced motion and
sticky-project transitions. Verify panel readability, absence of horizontal
overflow, focus visibility and dismissal without unintended navigation.

Performance classification is possible. The controller-reviewed acceptance condition is
zero added device-stage mounts, asset reloads or entry-animation restarts caused
by opening/switching explanations. Verify lifecycle with focused instrumentation
where useful and confirm the visible behavior during controller review.

## Boundaries

- Always: preserve unrelated changes, respect CONSTRAINTS.md, verify installed
  library APIs, maintain keyboard access and use accurate project descriptions.
- Resolve first: missing factual content before publication acceptance. Changes
  to page scope or new dependencies require revisiting this spec.
- Never: fabricate a project's stack, weaken checks, add skipped tests or
  suppression comments, replace the existing visuals, or run builds/servers and
  browser verification without controller delegation.

## Success criteria

1. Every integrated project replaces discipline chips with What? and How? pills.
2. Each answer meets the content contract and is understandable independently.
3. Native HeroUI opening, dismissal and focus handling work using keyboard,
   pointer and touch; no custom overlay coordination is added.
4. Panels remain readable and correctly layered at the reviewed sizes and zoom.
5. Existing project visuals, animation behavior and live links retain their behavior.
6. Focused tests, types and lint pass; controller build and browser acceptance pass.

Remaining editorial input: confirmed What and How paragraphs for real projects.
Build and browser acceptance follow the controller responsibilities above.
