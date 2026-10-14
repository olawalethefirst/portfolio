# Shared section heading spec

## Objective and scope

Connect portfolio sections through one reusable `SectionHeading` component:
centred, uppercase, outline-only typography over each section's own background.
Each section renders its own instance of the same component and visual rules.

The first implementation applies the heading to the actual Projects
and Publications sections in `/prism-fiber-lab`. Contact is deferred
until a contact section exists in that lab. The hero identity and individual project/card titles are outside scope.

## Visual contract and adjustable defaults

- Use the existing section container and gutters. Add no heading-specific
  maximum width, outer container, or duplicate horizontal padding.
- Centre the heading horizontally and centre its text.
- Render uppercase visually while preserving a meaningful accessible name.
- Use the existing sans-serif family at weight 900 with tight letter spacing.
- Keep the heading background and letter interiors transparent.
- Use a 0.75px outline in inherited text colour.
- Use one shared responsive font size: `clamp(2.4rem, 12cqi, 10rem)`.
  An inline-size query wrapper measures existing section content width without
  adding a width cap or padding. Short titles stay centred and occupy less width;
  all titles at the same container width share the same font size.
- Render semantic HTML text without SVG fitting or runtime measurement.
- Prefer one line; allow wrapping instead of clipping at narrow widths or
  enlarged text sizes.
- The heading wrapper owns section entry spacing and the gap to its content:
  3rem top and bottom padding, increasing to 4rem from 64rem.
  Remove duplicate top padding from heading containers/sections. Sections own
  their content exit spacing: Publications retains 5rem bottom padding, rising
  to 6rem from sm, so its cards have clearance before About begins.
  Keep About original section padding and the Projects 25dvh spacer
  as an explicit sticky hold. Project item internal spacing remains separate.
- About retains its original standalone small, centred, muted “About me”
  heading and original section/heading spacing. It does not use SectionHeading.
- No entrance animation, scroll effect, shadow, glow, or decorative duplicate
  text in the first preview.

These values are initial preview defaults, not immutable design constraints.
Adjust shared values after review rather than creating per-section variants.

## Component and project structure

Use the existing React, TypeScript, Tailwind, and theme-token stack without new
dependencies. Place the shared component alongside existing UI primitives at
`src/components/ui/SectionHeading.tsx`. Follow their export and formatting
conventions. Use Tailwind for layout and typography; the scoped
`section-heading-outline` rule in `app/globals.css` owns outline support and
forced-colours fallback, without a CSS module. Follow existing integration
conventions. Integrate Projects and Publications in
`app/prism-fiber-lab/PrismHeroLayoutLab.tsx` using the existing section
containers. Do not add a separate demonstration block.

Render a semantic `h2`; allow a caller-provided `id` so the containing section
can reference it with `aria-labelledby`. Keep the initial interface limited to
title content and section labelling needs, without per-instance visual variants.
Example intended usage:

```tsx
<section aria-labelledby="projects-heading">
  <SectionContainer>
    <SectionHeading id="projects-heading">Projects</SectionHeading>
  </SectionContainer>
</section>
```

The section owns background, text colour, and outer layout. The shared heading
owns typography, alignment, and spacing around the title. Use filled HTML
text in forced-colours mode or when outlines are unsupported;
normal supported rendering remains outline-only.

## Acceptance and verification

- Projects and Publications use the same component and spacing rules;
  About retains its original heading.
- The outline and hollow interiors are visible over both the page background
  and a section surface, in light and dark modes and all existing accent themes.
- Review at 320px, 390px, 768px, and 1440px viewport widths, including 200% text
  enlargement: no clipping, horizontal overflow, or collisions with content.
- Publications remains readable at the smallest width; shorter titles share
  the same font size and remain centred without growing taller.
- The heading remains semantic and accessible without duplicate spoken text.
- Existing section container widths and gutters remain intact.

This is Level 0 visual-review work under `CONSTRAINTS.md`; no new automated
styling or static-markup tests are expected. Performance classification is
`none`: static CSS without runtime measurement, animation, or dependencies.

For implementation, run:

```sh
pnpm exec tsc --noEmit
git ls-files --cached --others --exclude-standard -z -- '*.js' '*.jsx' '*.mjs' '*.ts' '*.tsx' | xargs -0 pnpm exec eslint --
```

The human controller owns `pnpm build` and browser/accessibility/visual review
unless explicitly delegated, as required by `CONSTRAINTS.md`. Read the relevant
installed Next.js guides before implementation.

## Boundaries

- Always preserve project constraints, existing theme ownership, semantic
  structure, and unrelated changes.
- Confirm scope before rolling the preview into every portfolio section or
  changing the hero and card titles.
- Never add a heading background, separate width cap, per-frame auto-fitting
  loop, dependencies, or test/check suppressions to implement this preview.

No open design questions block the preview; shared defaults can be revised
after visual review.
