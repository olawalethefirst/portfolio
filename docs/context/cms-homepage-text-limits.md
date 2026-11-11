# CMS homepage text limits

Owner-approved initial limits, recorded 2026-11-09. Hero Save and
Project/Publication Publish schemas enforce the budgets below.

Use the current dummy content as a conservative starting point; increase limits
when needed through an explicit rule change. For fields shared by several
records, use the longest existing dummy value. All Hero stages share the longest dummy tagline and description budgets.
Freeze the numbers below: do not calculate runtime limits from mutable fixtures.
These are content budgets, not a guarantee that every string fits every viewport.

## Shared configuration

[`src/config/content-limits.ts`](../../src/config/content-limits.ts) is the
executable source of truth. It has no UI, framework, database or fixture imports.
Hero, Project and Publication Zod schemas and their limit error messages consume
`CONTENT_LIMITS` directly. Update that config when an increased budget is approved;
keep this map and the independent boundary-test expectations aligned.

Future server validation and database migration tooling should import the same
config. An existing database changes only through an explicit reviewed migration;
do not dynamically rewrite database constraints on application startup or import
current config into an old migration that must remain reproducible. Capture the
approved values in each versioned migration when creating or changing constraints.

Database enforcement must preserve action scope: Project/Publication draft storage
allows over-limit content; publication constraints belong at the published-content
boundary. Article body remains outside these budgets. SQL character-count functions
may count differently from JavaScript UTF-16 code units. Before adding database
constraints, implement equivalent counting or explicitly approve and migrate a
shared counting-policy change. Database integration remains deferred.

## Field map

| Area | Schema field | Maximum | Baseline source |
| --- | --- | ---: | --- |
| Hero | `eyebrow` | 16 | Product delivery |
| Hero | `headline` | 20 | Ideas into products. |
| Hero | `stages.{idea,iterate,solution}.tagline` | 26 | Make uncertainty testable. |
| Hero | `stages.{idea,iterate,solution}.description` | 56 | Current idea description |
| Project | `name` | 11 | Field Notes |
| Project | `summary` | 92 | Relay summary |
| Project | `what` | 228 | Field Notes What popover |
| Project | `how` | 294 | Field Notes How popover |
| Publication | `title` | 40 | Longest current card titles |
| Publication | `summary` | 112 | Productive constraints summary |
| Publication | each parsed tag | 16 | Product strategy / Systems thinking |
| Publication | parsed tag count | 3 | First publication card |

Sources: [Hero defaults](../../src/components/prism-fiber/ui/hero/prism-hero-content.ts),
[project fixtures](../../src/components/project-item/lab-projects.ts),
[publication fixtures](../../app/lab-publications.ts).
Project What/How popovers and publication topic chips are part of the homepage
surface. Apply tag limits to the existing parsed tags, not the comma-separated
`tagsText` string; preserve existing parsing behavior.

## Enforcement contract

- Count string length using JavaScript UTF-16 code units (`string.length`),
  including spaces and punctuation, matching Zod string maximum checks. Do not
  add trimming or normalization for these limits.
- Hero Save enforces the mapped limits alongside existing requiredness.
- Project and Publication Publish/Update published enforce their mapped limits.
  Save draft still accepts incomplete and over-limit text. Working drafts always
  retain entered values, including invalid text.
- Reuse rules at editor and provider boundaries. Show actionable inline errors
  through the migration's blur/correction/submit behavior. Never silently truncate
  text or prevent typing/pasting over-limit drafts through input `maxLength`.
- Publication `bodyMarkdown` (actual detail content) is excluded. No new homepage
  length limits apply to URLs, image sources/alternative text, dates, platform
  enums, About, Contact or SEO. Existing rules still apply.
- During implementation, verify exact-limit acceptance and one-over rejection,
  retained over-limit drafts, correction feedback and provider enforcement.

These approved limits are the explicit exception to preserving existing content
rules in the [validation contract](cms-validation-spec.md).
