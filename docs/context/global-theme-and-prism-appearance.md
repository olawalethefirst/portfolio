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
context bridge cross the Canvas boundary. Its mode effect calls the built
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
