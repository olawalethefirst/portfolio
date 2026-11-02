# Portfolio

Interactive portfolio built with Next.js, React, HeroUI, and React Three Fiber.

## Development

```sh
pnpm install
pnpm dev
```

- `/` renders the portfolio preview with the Prism hero, projects, publications, and about section.
- `/publication-details-lab` previews a Markdown publication and its comment threads.

Both labs share global theme and display controls. Their sample data and referenced assets are retained alongside reusable components.

## Checks

```sh
pnpm exec tsc --noEmit
pnpm lint
pnpm test
```

Read [CONSTRAINTS.md](CONSTRAINTS.md) before changing code. Production builds and browser verification belong to the human controller unless explicitly delegated.

Durable architecture, contracts, and decisions are indexed in [docs/README.md](docs/README.md).
