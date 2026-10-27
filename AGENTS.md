<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

Read `CONSTRAINTS.md` before writing code. Do not weaken it to make a change pass. Durable project knowledge belongs under `docs/` using `docs/README.md`; task progress and raw evidence do not.

When planning or changing text fields or buttons, follow `docs/context/field-and-button-icon-policy.md`: consider icons for inputs and non-ghost buttons during planning; textareas and ghost buttons are icon-free by default, with justified exceptions.

Invoke the global `software-task-workflow` when the normalized, case-insensitive standalone command is `bootstrap task workflow`, or when a direct execution request places a work action before `task`, such as `work on task:`, `start task:`, `continue task:`, `resume task:`, `plan task:`, `implement task:`, or `fix task:`. Quoted examples, questions about these phrases, and informational mentions do not invoke it. The requested action bounds authorization; for example, `plan task:` does not authorize implementation.
