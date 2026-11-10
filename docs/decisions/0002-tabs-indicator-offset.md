# 2. Handle the HeroUI Tabs indicator offset by convention

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
instead—tab panels present or absent, `selectedKey` passed or omitted,
separators present or absent, primary or secondary variant, and page position—
changed nothing. The offset depends only on how many instances precede an
instance on the page, accumulating 16 pixels each time.

The mechanism is in React Aria's `SharedElement`, which HeroUI's indicator uses.
On mount it compares a stored rectangle against a fresh one and writes their
difference to the element's inline `translate`. The defect reproduces with raw
HeroUI `Tabs` composed exactly as documented, so nothing in this repository
causes it.

HeroUI 3.2.5 changes tab content alignment and a focus-visible selector, while
the relevant React Aria implementation remains unchanged from the installed
version.

## Decision

Handle the defect through a documented usage convention rather than patching
the component. On a page with more than one uncontrolled `Tabs` instance, give
every instance after the first a `defaultSelectedKey` that matches no tab id.
The exported `TABS_NO_DEFAULT` sentinel is the string `"null"`.

Keep using the official HeroUI compound API. Do not add internal-class
manipulation or indicator-specific effects to the local wrapper.

## Consequences

A nonmatching default sidesteps the offset. React Aria falls back to the first
tab, so the control still has a selected tab and correctly placed indicator.
From the user's first selection onward it behaves like any other Tabs instance.

The fallback is internal to tab state, so `onSelectionChange` does not fire for
it. Consumers that need selection state at load must use controlled
`selectedKey`. A sentinel-backed instance also cannot choose a different
uncontrolled initial tab, and the sentinel must never collide with a real tab
id.

An earlier code workaround cleared the stale inline `translate` from the
indicator during a layout effect. It was rejected because it did not hold in
practice and depended on HeroUI's internal `.tabs__indicator` class. The usage
convention relies only on public API and remains visible at each affected call
site.

Remove the convention once browser verification confirms that HeroUI or React
Aria fixed the underlying defect.
