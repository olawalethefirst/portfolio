# 2. Handling the HeroUI selection indicator offset by convention

- Status: accepted
- Date: 2026-09-15

## Context

On any page holding more than one HeroUI `Tabs` instance, every instance after
the first renders its selection indicator vertically offset from the tab it
belongs to. The offset appears on first paint and persists until the user
changes tabs, at which point it corrects itself permanently.

The cause was isolated by measurement rather than inspection. Holding
configuration constant and varying only page position produced deltas of 0, -16,
and -32 pixels for the first, second, and third instance. Varying configuration
instead — tab panels present or absent, `selectedKey` passed or omitted,
separators present or absent, primary or secondary variant, position near the
top of the page or a thousand pixels below it — changed nothing. The offset
depends only on how many instances precede an instance on the page, accumulating
16 pixels each time, which is half a tab's height.

The mechanism is in React Aria's `SharedElement`, which HeroUI's indicator is
built from. On mount it compares a stored rectangle against a fresh one and
writes the difference to the element's inline `translate`:

```js
let deltaY = prevRect.top - currentItem?.top;
element.style.translate = `${deltaX}px ${deltaY}px`;
```

Both rectangles come from `getBoundingClientRect`, so they are viewport relative
and captured at two different moments.

Several explanations were tested and disproved: React StrictMode, which was
ruled out by disabling it; an absolutely positioned wrapper causing reflow;
vertical position on a settling layout; and every configuration difference
between this repository's wrapper and HeroUI's documented anatomy. The defect
reproduces with raw HeroUI `Tabs` composed exactly as documented, so nothing in
this repository causes it.

There is no version to upgrade to. `@heroui/react` 3.2.5 changes only tab
content alignment and a focus-visible selector, and `react-aria-components`
1.21.1 and its v3 nightly both carry the responsible file byte for byte
identical to the installed 1.21.0.

## Decision

Handle this by documented convention rather than by patching the component.

On a page with more than one `SegmentControl`, every control after the first is
given a `defaultValue` that matches none of its items. The reserved sentinel is
the string `"null"`.

## Consequences

A default matching no item sidesteps the offset. React Aria falls back to
selecting the first tab, so the control still renders with a segment selected and
its indicator correctly placed, and from the user's first selection onward it
behaves identically to any other control. There is no unselected state and no
gap in what assistive technology reports.

The cost is narrower than it first appears. The fallback is internal to the tab
state, so `onValueChange` does not fire for it: a consumer tracking the selection
in its own state holds no value until the user picks one, and anything needing
its selection known at load should be controlled through `value` instead.
Relatedly, a control using the sentinel cannot choose a different initial
segment — it will start on the first. The sentinel must also never collide with a
real item value, which is why a reserved-looking string is preferred to an empty
one.

A code workaround was implemented first and rejected. It cleared the stale inline
`translate` from the indicator in a layout effect on mount. It did not hold in
practice, and it depended on `.tabs__indicator`, an internal HeroUI class name
that would have failed silently if renamed. The convention has neither problem:
it uses only the component's public API, and it is visible to anyone reading the
props. The sentinel is exported from the component as
`SEGMENT_CONTROL_NO_DEFAULT` so the convention is reachable in code rather than
existing only in prose.

Because this is a usage rule rather than behaviour enforced in code, nothing
prevents a consumer from omitting it, and the symptom returns when they do. It
is therefore documented in three places that a consumer or the remote design
agent will actually read: the component contract in
`docs/contracts/component-map.md`, the component's own page under
`.design-sync/docs/`, and the shared conventions header, as well as on the
`defaultValue` prop itself in the design-sync prop contract.

Remove the convention once HeroUI or React Aria fixes the underlying defect. A
drafted upstream report is kept in the local task workspace, unfiled pending the
owner's decision on whether to send it and to which project.
