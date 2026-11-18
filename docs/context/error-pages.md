# Error and not-found pages

Every failure screen uses the shared `ErrorPage`
(`src/components/error-page/ErrorPage.tsx`): the large plug-disconnected icon
(`PlugDisconnectedIcon`, recolored with `currentColor`), a level-one title, a
message and one action, "Back to home" by default. The message is per page.

| File | Shows when | Message |
|---|---|---|
| `app/not-found.tsx` | `notFound()` is thrown, or no route matches | Page not found |
| `app/publications/[id]/not-found.tsx` | An article is absent or unpublished | Publication not found |
| `app/error.tsx` | A segment throws while rendering | Something went wrong |
| `app/global-error.tsx` | The root layout itself throws | The site hit a problem |

`error.tsx` and `not-found.tsx` render inside the root layout, so they get the
saved theme and mode like any page. `global-error.tsx` replaces the root layout:
it imports `globals.css`, renders its own `<html>` and `<body>` (dark default) and
wraps the page in `AppearanceProvider`, so it follows the device. It cannot read
the saved choice, because that needs the request cookies the root layout reads
on the server. Error boundaries log the error with `console.error`; there is no
reporting service. The installed Next.js version passes `retry()` as well as
`reset()` to error boundaries; none is offered, only the way home.
