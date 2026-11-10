# Publication table of contents

PublicationDetails derives a title-free Article sections navigation from top-level
Markdown h2 and h3 headings. Below 1024px, a ghost Contents button with a ListTree icon appears after
metadata and opens a bottom HeroUI Drawer. At lg, the list is a sticky right sidebar in the existing max-w-6xl content
boundary. The sidebar is 14rem wide with a 3rem gap, leaving 39rem for the body
at the 1024px transition with the current desktop gutters. It remains inside the body region, before comments.
No headings means no navigation or sidebar column.

The sidebar starts 2rem below the viewport top and scrolls internally when taller
than the available viewport. Its height reserves space for the fixed bottom
navigation. The mobile drawer closes on section selection, dismissal, or transition to the
desktop breakpoint. It has an accessible Article sections name and no visible
list title; the Contents trigger provides the visible label. Long labels wrap. The nav has
an accessible label but no visible title; all entries are native hash links using
HeroUI Link. h3 entries nest under the preceding h2; an initial h3 is ungrouped.
useActivePublicationHeading shares one active heading ID between the sidebar and
drawer. The active link uses accent text, semibold weight and
aria-current="location". Before the first heading reaches the activation line,
no link is current. CSS controls responsive placement; native fragment links
continue to own navigation and URL history.

publication-headings.ts uses unified, remark-parse and remark-gfm. The same
assignPublicationHeadings transformation supplies IDs for both the contents
metadata and the Markdown renderer. IDs use a publication-section- prefix,
Unicode letters/numbers, and collision suffixes. Slug state is local to each
article pass. This parser runs independently for metadata and rendered content,
with the same deterministic algorithm. Code, blockquote and list examples are
excluded by considering only root-level heading nodes. Setext h2 syntax and
formatted heading labels are supported.

Eligible rendered headings get tabIndex=-1 and scroll margin for fragment focus
and reading-progress clearance. Native hash/history behavior is preserved.
Both link-to-heading correspondence and parsing edge cases have focused tests;
responsive placement, sticky scrolling, actual fragment focus and theme contrast
require controller browser review under CONSTRAINTS.md.

## Active-section tracking

The activation line is 2rem from the viewport top, matching heading scroll margin
and adapting to the root font size. The last heading to cross it stays active
until a later heading crosses, including while scrolling through long sections.
At the document bottom, select the final section when it cannot reach that line.
After the article, keep the final section current while reading comments.

IntersectionObserver schedules checks for heading visibility/layout changes.
Passive window scroll events also schedule checks so fast jumps that skip every
intersection still work. Resize, hashchange and pageshow handle viewport changes,
anchor navigation and history restoration. Checks read heading geometry in source
order and coalesce into at most one pending animation frame; state changes only
when the active ID changes. No scroll-time URL writes or automatic scrolling of
the contents list occur. Observer, listeners and pending frames are cleaned up on
unmount or heading-list changes. A passive scroll-based fallback works when
IntersectionObserver is unavailable.

Focused tests cover both scroll directions, gaps and jumps, initial anchored
positions, document-bottom selection, cleanup and shared sidebar/drawer state.
Native scrolling, layout shifts, font scaling, mobile modal interactions and
visual contrast still require controller browser review. Performance criterion:
at most one pending frame per event burst, with no React state update for an
unchanged active section. This criterion is covered by hook tests; actual browser
performance remains a controller check if concerns arise.
