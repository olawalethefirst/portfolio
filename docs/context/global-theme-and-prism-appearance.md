# Global theme and Prism appearance

`html[data-theme][data-mode]` owns the applied theme for every route. The root
layout emits the `DEFAULT_THEME` from `src/theme/theme.ts` during server render.
Shells and pages must not add local theme attributes or reset selection when
mounted. A selection survives client navigation; a reload returns to the global
default. Persistence and system-mode selection are not currently implemented.

`setGlobalTheme()` and `setGlobalMode()` in `src/theme/active-theme.ts` validate
inputs, update the requested HTML attribute, and notify subscribers immediately.
`useActiveTheme()` also observes direct attribute mutations with one shared
MutationObserver. Its cached snapshots support React's `useSyncExternalStore`,
including a stable server default, late subscribers, and cleanup when the final
subscriber leaves. Missing or invalid attributes fall back per dimension to the
default without changing the DOM during rendering.

Palette values remain in `src/styles/design-tokens.css`. Selectors are scoped to
HTML, and the Tailwind `dark` variant uses `html[data-mode="dark"]` explicitly
rather than following the operating system independently. Accent swatches read
the palette through `src/theme/theme-accents.ts`; the existing application import
path re-exports that module.

The Prism Scene reads the same global hook directly; no theme props or React
context bridge cross the Canvas boundary. Its committed update calls the built
structure's `applyAppearance()` method, which changes only the owned backing
material's color/opacity and the figure spotlight's intensity:

| Mode | Backing | Opacity | Figure intensity |
|---|---|---|---|
| Dark | White | 0.10 | 1.0 |
| Light | Black | 0.10 | 2.0 |

These values reproduce the executable mode mapping in `prism-scroll-sim.html`.
The React spotlight retains its existing position, warmth, distance, decay, and
target. Appearance changes do not rebuild the graph, recreate the transition
controller, reset the camera, or replay pose/monitor transitions. Appearance is
separate from the semantic `idea`/`iterate`/`solution` channels. SVG accent
recoloring remains deferred.

Browser review must assess the backing and figure against the actual semantic
surface colors, including light mode. The lab uses `bg-surface`; the HTML
prototype used different backdrop values, so matching the mappings alone does
not establish visual parity.

## Notes and monitor accents

Prism notes derive three colors from the global `--accent` in
`src/styles/prism-appearance.css`: relative OKLCH lightness +0.15/base/-0.15,
with the light variant's chroma multiplied by 1.2. Browsers lacking relative
OKLCH use 75% accent mixed with white/black in sRGB. Both modes share this
palette. Browser computed styles and Canvas convert these values to sRGB hex
before Three's material color conversion. The three owned note materials are
updated without changing source assets or rebuilding the scene.

The monitor replaces only the original SVG's exact `#6C63FF` accent tokens.
Immutable same-origin SVG text is shared; generated textures belong to each
scene effect. The latest request wins, pending image loads are cancelled,
object URLs are released, and replaced/stale/current textures are disposed.
The office material retains opacity, mirroring and the original texture's
color-space setting. Mode-only updates do not regenerate textures.
Recoverable palette/load errors are reported to the console and retain
last-good rendering; later theme selections retry. Browser visual review is
still needed for actual CSS gamut handling and note separation.


## Committed scene ownership

PrismScene keeps a stable resource-free Group host. A layout-effect setup builds
and attaches the owned graph and controller; cleanup detaches the graph,
cancels appearance work and disposes it. Strict Mode replay builds a fresh graph.
Uncommitted renders allocate no GPU resources. Builders release partial owned
resources before propagating construction failures.

A scene-local appearance owner reads three note colors per theme selection;
the monitor reuses the base color. The shared converter uses one temporary CSS
probe and one Canvas per batch, preserving CSS/Canvas validation. Appearance
updates and mode changes preserve the live graph and transition controller.
Generated monitor textures belong solely to the monitor request owner; the
original fallback clone belongs to the office builder. Finished requests clear
their cancellation bookkeeping. Previous-texture cleanup errors are reported
without disposing the newly installed replacement.
