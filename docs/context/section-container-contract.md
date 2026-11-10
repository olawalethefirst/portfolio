# Section container contract

The `/` hero, project headers and footers, publications,
About/CTA, and the `/contact` form use `src/components/ui/SectionContainer.tsx` for a shared content
boundary: Tailwind `container mx-auto px-4 sm:px-6`. Horizontal padding is
16px below `sm` and 24px from `sm` upward at the default root font size.
Vertical spacing remains section-specific. Backgrounds and immersive scenes
span the viewport in the hero; narrower reading widths remain inside the container.
Project device canvases instead use the same padded content width as their headings
and footers, with full section height.

Apply horizontal padding once per content boundary. Do not introduce a separate
outer maximum width or larger desktop gutters for one of these sections.

The hero keeps an inner positioning wrapper so absolute portrait content and
controls align with the padded content area. In desktop and tablet landscape
layouts, the editorial block starts at the left content edge; its narrower
reading width does not introduce centering margins within the left column. Its container increases horizontal
clearance when a device safe-area inset exceeds the normal gutter. Portrait
spread calculations use the measured composition width rather than viewport
width; canvas coordinates and vertical safe-area clearance remain unchanged.

Acceptance requires matching outer container widths and gutters, no horizontal
overflow, and intact portrait/landscape hero composition, camera framing,
sticky project stacking, scroll discovery, and keyboard access. Check mobile,
tablet, and desktop widths, including breakpoint boundaries and wide screens.

This is Level 0 visual-review work under `CONSTRAINTS.md`; static class assertions
are not useful additional tests. Existing hero measurement and interaction tests
remain applicable. Run `pnpm exec tsc --noEmit`, repository-wide ESLint, and the
focused existing tests. The human controller owns `pnpm build` and browser,
accessibility, and responsive visual verification unless explicitly delegated.
Performance classification is `none`: this changes layout without adding runtime
animation, dependencies, or rendering work beyond static wrappers.

## Rotation-safe project models

Project models are centered from their unrotated asset bounds before entry rotation.
A sphere enclosing those bounds reserves room for every orientation. Model scale
is capped using the camera distance and the narrower horizontal/vertical field of
view, leaving 10% radius clearance. The existing preferred size remains the upper
limit. Canvas resize recomputes the cap without per-frame geometry scans.

This fitting logic is Level 2: `device-framing.test.ts` protects perspective edge
clearance on narrow and wide views and preservation of sizes that already fit.
Verify both project models through their complete entry rotations in the browser,
including short landscape and narrow portrait windows. Text overlap is a separate
layout concern; this contract reserves canvas edge clearance rather than measuring
header/footer content. Performance remains `none`: bounds are memoized per asset
and the demand-driven animation loop is retained.

## Bottom clearance for navigation

Containers ending behind the navigation pill use
`pb-[var(--navigation-bottom-clearance)]` on their inner content, rather than
adding padding outside a viewport-height section. Contact form content, its
thank-you state, and About/CTA use this shared clearance. Intermediate
article/project/publication spacing remains owned by those layouts.

The shared tokens in `src/styles/design-tokens.css` reserve the pill's 3.5rem
height, a bottom offset of the greater of 0.5rem or the device safe-area inset,
and a 0.75rem content gap. This totals 4.75rem (76px at the default font size)
without a larger safe area. Both fixed navigation and the home page's sticky
navigation lane use the same bottom offset. The pill enforces the shared
minimum height; expanded navigation is an overlay and does not increase the
content clearance.
