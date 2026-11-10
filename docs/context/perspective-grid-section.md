# Perspective grid sections

`src/components/ui/PerspectiveGridSection.tsx` shares the decorative SVG floor
grid between About and Contact. It accepts native section props, including refs,
so About can keep its GSAP scope on the section itself.

The wrapper owns relative positioning, an isolated stacking context, and the
non-interactive, accessibility-hidden background. Consumers own background color,
height, spacing, and content layout. Only the decorative layer clips overflow;
the wrapper does not create a scroll container or clip content focus rings.

`gridOpacity` defaults to `0.1`. About and Contact both explicitly use `0.2`
for matching intensity. The SVG retains its original line opacity and bottom fade. This is a
static vector decoration with no animation or additional client state.
