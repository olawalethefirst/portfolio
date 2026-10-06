# Desktop Prism zoom centering

The hero's Prism starts in its measured right-hand home frame, moves horizontally
toward the canvas center throughout discovery progress 0–1, reaching the center
at progress 1. Progress refers to normalized discovery progress, not camera
distance. Horizontal projection offset decreases linearly to zero at 1;
existing distance interpolation and vertical framing are preserved.

Desktop eligibility follows the visible two-column hero initial region (`lg`,
or `md` landscape). Mobile keeps its existing projection. Eligibility is explicit
and must not be inferred from an off-center home frame. Resize and orientation
changes reapply framing at current progress. Reverse scrolling retraces the path;
recentre restores orientation while preserving progress-dependent framing.
Zoom updates preserve orbit direction and existing reduced-motion handling.

Implementation uses the existing Three.js perspective camera view offset in
`src/components/prism-fiber/stage/PrismStage.tsx` and a named interpolation helper
in `stage/prism-discovery-view.ts`. Hero measurement communicates eligibility
through Prism props. Use existing TypeScript conventions and dependencies;
do not alter geometry, zoom timing, content, or project constraints.

Behavior is test level 2: focused Vitest tests cover milestones, invalid progress,
reverse scrolling, recentre, and responsive eligibility transitions. Performance
is classified possible: no React render per scroll event, additional animation
loop, or additional WebGL draw calls. Visual verification must confirm movement,
framing, keyboard controls, and breakpoint transitions.

Agent checks:

```sh
pnpm exec vitest run src/components/prism-fiber
pnpm exec tsc --noEmit
git ls-files --cached --others --exclude-standard -z -- '*.js' '*.jsx' '*.mjs' '*.ts' '*.tsx' | xargs -0 pnpm exec eslint --
```

The human controller owns `pnpm build`, browser/accessibility inspection, and
performance verification unless explicitly delegated, per `CONSTRAINTS.md`.
