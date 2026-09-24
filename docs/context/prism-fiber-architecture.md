# Prism Fiber Architecture

## Purpose and current status

This guide explains how the React Three Fiber prism works, with emphasis on
what each layer and utility contributes to the rendered result. It assumes
basic React familiarity but no previous Three.js implementation experience.

The current implementation:

- presents the three literal states `idea`, `iterate`, and `solution`;
- separates UI ownership, stage concerns, and scene construction;
- gives every stateful 3D object a small transition interface;
- keeps animation progress private to the scene;
- uses the existing `HeroControlPanel` for named-state selection, autoplay,
  progress display, and camera recentering;
- has no global `window.*` controls or public numeric-progress API;
- preserves the approved models, composition, poses, camera, and lighting.

The lab route is `/prism-fiber-lab`. It remains a development presentation,
not the final portfolio integration.

## What is rendered

The prism has three faces:

| State | Face content | State-dependent behavior |
|---|---|---|
| `idea` | Board and 12 notes | Prism turns to 155°, figure uses the Idea pose, monitor is hidden |
| `iterate` | Projector and wireframe | Prism turns to 85°, figure uses the Iterate pose, monitor is hidden |
| `solution` | Office, monitor, and figure | Prism turns to 120°, figure uses the Solution pose, monitor is visible |

The angles are art-directed presentation angles. They are deliberately not an
even mathematical division of the triangular prism.

## Three.js concepts used here

### Scene, camera, and renderer

The **scene** is the tree containing all renderable objects and lights. The
**camera** determines the viewpoint. The **WebGL renderer** converts what the
camera sees into pixels on a canvas.

React Three Fiber's `Canvas` creates and manages all three. Our Stage Layer
configures them, while the Scene Layer supplies the object tree placed inside
the scene.

### Object3D, Group, and scene graph

Almost every Three.js object inherits from `Object3D`, which provides
position, rotation, scale, and parent/child relationships. A `Group` is an
invisible Object3D used to move several children as one unit.

The parent/child tree is called the **scene graph**. A parent's transform
affects every descendant. Rotating the prism Group therefore turns every face
and every object attached to those faces together.

### Mesh, geometry, material, and texture

A visible `Mesh` combines:

- **geometry**, which defines its shape; and
- **material**, which defines how that shape looks.

A **texture** is image data sampled by a material. The figure uses a JPG
texture. The monitor and projector graphics use SVG textures placed on newly
created plane geometry.

Those generated planes are the screen overlays. They are real 3D surfaces
positioned just in front of a screen mesh in the imported model. They let us
show a custom graphic without editing the GLB file. A small offset along the
screen normal prevents both surfaces competing for the same pixels.

### Local and world space

Local coordinates describe an object relative to its parent. World
coordinates include every ancestor transform. Imported GLBs often have nested
transforms, so screen alignment uses each screen mesh's world matrix rather
than assuming the source model's axes.

### Bounding boxes

A `Box3` is the smallest axis-aligned box enclosing an object. The builders use
bounding boxes to measure assets, normalize differently authored models to a
common face size, find a bottom edge, and size screen overlays.

### Euler angles and quaternions

Euler angles express X/Y/Z rotations and are convenient for authoring pose
deltas in degrees. Quaternions represent orientation in a form suited to
combining rotations and smoothly interpolating between them.

The figure's readable degree values are converted to quaternions. Each target
is composed after the bone's original rest quaternion, then animation uses
spherical interpolation (`slerp`).

### Skeleton, Bone, and SkinnedMesh

A `SkinnedMesh` has vertices influenced by a hierarchy of `Bone` objects.
Rotating an arm bone deforms the corresponding part of the figure rather than
turning the complete character as a rigid object.

The figure builder captures the selected bones and their authored rest
orientations. This matters because pose values are adjustments to the model,
not replacements for its original rig orientation.

## Architectural layers

```text
PrismPresentation                              UI Layer
  ├─ usePrismAutoplay                          state + UI timer
  ├─ HeroControlPanel                          HTML controls
  └─ Prism state="idea"                        stable public facade
       └─ PrismStage state="idea"              Stage Layer
            owns Canvas, camera, lights, controls, fallback
            └─ PrismScene state="idea"         Scene Layer
                 loads assets and runs transitions
                 └─ built Three.js graph
                      ├─ BoardObject
                      ├─ ProjectorObject
                      ├─ OfficeObject
                      └─ FigureObject
```

### UI Layer

`ui/PrismPresentation.tsx` owns application meaning. Its prism state value is
one of the three names, never an angle or scene-animation percentage. It also
owns the full-viewport lab presentation, theme attributes, HTML interaction
hint, and `HeroControlPanel` integration.

`ui/usePrismAutoplay.ts` owns the UI playback sequence. It cycles through
Idea, Iterate, and Solution every six seconds and supplies a MotionValue from
0 to 100 for the panel's progress bar. Selecting a tab resets that UI timer.
This value describes time until the next named state; it is separate from the
Scene Layer's private 0–1 interpolation used after a state has changed.

Manual camera exploration pauses autoplay. The panel then uses its center
button for recentering rather than play/pause. Recentring clears rotational
drift but deliberately retains the fact that the user has entered manual
exploration.

The UI does not own animation easing. It says *where the experience should
go*, while each rendered object decides *how its own property moves there*.

### Stage Layer

`Prism.tsx` is the stable public facade. Its API has a required semantic
`state`, an optional container `className`, an optional semantic view-state
callback, and a `recentreView()` handle. It exposes no Three.js types,
animation progress, or object-level controls. The facade delegates rendering
to `stage/PrismStage.tsx` so internal stage organization can evolve without
changing consumer code.

`PrismStage` fills its parent. It does not
assume that its parent is the browser viewport. It owns:

- `Canvas` and WebGL renderer configuration;
- perspective camera and framing;
- general directional and ambient lights;
- `OrbitControls` and camera exploration;
- asset-loading suspension;
- the non-WebGL fallback.

The WebGL fallback is ordinary HTML shown if the browser cannot create the GPU
rendering context. It prevents a blank region and tells the user why the 3D
content is unavailable.

OrbitControls changes the camera only. It does not mutate the semantic prism
state. The Stage translates control activity into `hasEnteredZoom` and
`hasRotationDrifted`, so the UI does not need access to OrbitControls or camera
angles. Wheel zoom remains enabled for the lab; page-scroll integration is a
separate future decision.

### Scene Layer

`scene/PrismScene.tsx` receives the named state, loads cached assets, constructs
the object graph once, and advances private transitions from the render loop.
It is the boundary between React's declarative state and mutable Three.js
objects.

On the first render it snaps directly to the requested state. On later state
changes it starts a 700 ms transition from the objects' currently rendered
values. This also makes interruption safe: changing state halfway through an
animation starts from the visible pose instead of jumping to an old endpoint.

The temporary shared timeline value runs from 0 to 1 only while a transition
is active. It is not React state, not application state, and not exposed to a
consumer. It stops being advanced once the animation completes.

## State and transition contracts

### `state/prism-state.ts`

`PrismState` is the only value passed from normal React code into the 3D
layers:

```ts
type PrismState = "idea" | "iterate" | "solution";
```

`PRISM_STATES` is the canonical ordered list used by both autoplay and the
control-panel tabs. It prevents those consumers from defining duplicate state
lists that could drift apart.

`PRISM_STATE_TARGETS` maps each name to the object-specific numeric targets:

- prism Y rotation in degrees;
- monitor opacity.

The figure channel receives the `PrismState` name directly because its three
pose names are the semantic states; there is no duplicate pose-name domain.

This central mapping answers “what does Solution mean?” without requiring a
consumer to know anything about Three.js.

### `motion/motion-channel.ts`

A `MotionChannel<T>` is the stable local interface implemented by each
stateful object:

```ts
snap(target: T): void
beginTransition(target: T): void
update(timelineProgress: number): void
```

- `snap` applies an initial target immediately.
- `beginTransition` captures the object's current value and resolves its next
  target.
- `update` applies an intermediate value for the shared timeline position.

The target type can suit the object: a number for prism rotation and opacity,
or `PrismState` for the figure. Object-specific transition values remain
private.

### `motion/prism-transition.ts`

The transition controller coordinates all channels. It resolves one named
state, starts every channel at the same moment, and supplies the same temporary
timeline position on each frame. It does not know how a quaternion or material
should interpolate.

This shared clock prevents the prism, figure, and monitor from completing at
unrelated times. At the same time, it lets each channel apply a suitable local
easing curve.

### `motion/easing.ts`

These are small pure functions mapping a normalized timeline value to a local
movement curve:

- prism rotation uses cubic ease-in-out;
- figure bone slerp uses sine ease-in-out;
- monitor opacity uses cubic ease-out.

The Scene Layer owns the timeline; each object channel owns its easing because
the desired feel belongs to that object's visual behavior.

## Scene construction

### `scene/PrismStructure.ts`

This is the composition root for 3D content. It creates the triangular prism,
places its three faces at 120° intervals, invokes the four object builders, and
attaches the returned groups to their faces.

It also owns the prism-rotation channel because that channel mutates the
rotation of the prism Group created here. Its returned `channels` collection is
the only set of mutable controls given to the transition controller.

The relevant scene graph is:

```text
R3F scene
├─ perspective camera
├─ global lights
├─ OrbitControls
└─ root Group
   ├─ figure SpotLight
   └─ rotating prism Group
      ├─ glass backing + Idea face
      │  └─ board and notes
      ├─ glass backing + Iterate face
      │  └─ projector and wireframe overlay
      └─ glass backing + Solution face
         ├─ office and monitor overlay
         └─ skinned figure and light target
```

The figure spotlight is returned by the Figure builder because its target
depends on measured figure bounds. Its source sits outside the rotating prism,
while its target follows the figure inside it.

### Object builders

Each builder owns one understandable piece of scene construction and returns a
Group plus a cleanup function.

`BoardObject.ts` clones the board and notes, finds the board surface, creates
12 separately hinged note groups, applies the approved note offsets, and fits
the complete assembly onto the Idea face. It is static, so it has no motion
channel.

`ProjectorObject.ts` clones the projector, measures its screen, creates and
aligns the wireframe overlay plane, and fits the assembly onto the Iterate
face. It is static, so it also has no motion channel.

`OfficeObject.ts` clones the office, measures the monitor, creates and aligns
the monitor overlay, and exposes an opacity channel for its material. It uses
`MeshBasicMaterial` so the display graphic remains readable independently of
scene lighting.

`FigureObject.ts` performs a skeleton-safe clone, applies the separate figure
texture, finds required bones, captures their rest quaternions, creates the
figure-targeted spotlight, and exposes the named pose channel. Bone targets are
computed from rest pose plus the approved local delta. Each validated bone
binding owns its rest, transition-start, and target quaternion, avoiding
parallel untyped collections.

`figure-poses.ts` contains the exact bone names and readable degree-based pose
data. `resolveRestRelativeQuaternion` is the conversion boundary from authored
pose data to Three.js quaternion state.

This scope is intentional: objects with state have a transition API; static
objects do not receive a fake one merely for uniformity.

## Shared scene utilities

`scene/scene-utils.ts` holds operations that are useful to several object
builders:

| Utility | Role | Why it affects the result |
|---|---|---|
| `createOwnedResources` | Records generated/cloned geometry, materials, and textures and disposes them | Prevents GPU leaks without destroying loader-cached source assets |
| `isMesh`, `isSkinnedMesh`, `isBone` | Type-safe checks during generic object traversal | Lets builders safely access specialized Three.js fields |
| `cloneMaterials` | Clones cached model materials before modification | Prevents one prism instance from visually changing another |
| `setDoubleSided` | Makes cloned model materials render from both directions | Keeps surfaces visible as faces rotate |
| `requireMesh` | Finds a required named mesh or throws a useful error | Fails clearly when a GLB no longer matches the builder's assumptions |
| `surfaceDetails` | Measures a mesh and derives its world-space surface normal | Aligns monitor/projector overlays to imported geometry |
| `applyPropTransform` | Applies approved position, degree rotation, and scale | Adds the final art-directed placement |
| `fitAssembly` | Normalizes bounds, aligns the bottom edge, then wraps in a control Group | Makes differently authored assets fit the same prism face |
| `cloneTexture` | Clones cached textures before changing their settings | Avoids shared-cache mutation across instances |

`fitAssembly` deliberately separates two transforms. An inner assembly is
normalized from measured bounds; an outer control Group receives the tuned
composition. Tuning placement therefore does not destroy normalization math.

## React/Three boundary and lifecycle

`useGLTF` and `useTexture` load and cache source assets. `useMemo` builds one
Three.js graph for a resolved asset set. `<primitive>` inserts that graph into
the Fiber scene.

The builders clone anything they will mutate. Generated and cloned resources
are explicitly disposed on cleanup; shared cached source geometry is left
alone. `dispose={null}` prevents Fiber from recursively disposing resources it
does not exclusively own.

Frame-level values live directly on Three.js objects: Group rotations, Bone
quaternions, and material opacity. React retains the semantic state, while the
render loop performs interpolation without causing a React render on every
frame.

## End-to-end state change

When UI state changes from `idea` to `solution`:

1. A panel selection or completed autoplay interval updates UI state to
   `solution`.
2. `PrismPresentation` renders `Prism` with `state="solution"`.
3. Its Stage passes the same string to `PrismScene`.
4. The transition controller resolves the Solution targets.
5. Every motion channel captures its current rendered value.
6. On each frame, the controller advances one private 0–1 timeline.
7. The rotation channel lerps the prism angle with cubic easing.
8. The figure channel slerps rest-relative bone quaternions with sine easing.
9. The office channel fades monitor opacity with ease-out cubic.
10. At progress 1, the controller stops transitioning and no progress value is
   retained as application state.

## Renderer and stage settings

The Stage preserves the approved visual baseline:

- perspective camera: FOV 50°, position `[0, 0, 3]`, near `0.1`, far `100`;
- transparent antialiased renderer with DPR capped at 2;
- sRGB output, ACES filmic tone mapping, exposure 1, legacy light response;
- key directional light, fill directional light, and ambient light;
- horizontal damped orbiting, no panning, distance limited to `1.2–6`.

These values belong to the Stage because they describe how a composed scene is
presented, not how an individual scene object is constructed.

## Assets

All runtime assets live in `public/prism-assets/`:

| Asset | Use |
|---|---|
| `board.glb` | Idea board |
| `notes.glb` | Three authored note sources used to construct 12 notes |
| `projector.glb` | Iterate projector |
| `wireframe.svg` | Projector overlay |
| `office.glb` | Solution desk and monitor |
| `monitor-ui.svg` | Monitor overlay |
| `figure.glb` | Skinned figure and skeleton |
| `figure-texture.jpg` | Figure color texture |

Builders depend on several stable GLB mesh and bone names. `requireMesh` and
required-bone validation make an incompatible asset revision fail explicitly.

## Test coverage

- `state/prism-state.test.ts` locks the ordered states and their target
  mappings.
- `Prism.test.tsx` locks the semantic public API and its Stage delegation.
- `motion/prism-transition.test.ts` verifies initial snapping, shared timeline
  updates, interruption from current values, and completed-transition idling.
- `scene/objects/figure-poses.test.ts` locks the approved pose values and
  verifies rest-relative quaternion composition.
- `stage/PrismStage.test.tsx` verifies the Stage boundary, named-state flow,
  semantic exploration events, and recenter command.
- `ui/usePrismAutoplay.test.tsx` verifies ordered looping, manual selection,
  progress reset, and pause behavior.
- `ui/PrismPresentation.test.tsx` verifies control-panel wiring, UI state
  ownership, camera-exploration behavior, lab presentation, and absence of the
  retired fullscreen toggle.

These are structural and logic tests. Visual parity was manually approved;
there is not yet an automated WebGL screenshot regression test.

## Deliberately deferred

- reconciling OrbitControls wheel zoom with page scrolling;
- production hero integration;
- new visual tuning beyond the approved parity baseline;
- browser-level and pixel-diff tests.
