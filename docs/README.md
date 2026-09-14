# Project Knowledge

This directory stores durable knowledge that future contributors cannot reliably infer from code, tests, or Git history. It does not store task progress.

- `decisions/`: significant technical decisions and trade-offs. Use sequential ADR filenames such as `0001-example-decision.md`; supersede old records instead of deleting them.
- `domain/`: business terminology, rules, policies, and invariants.
- `contracts/`: stable API, event, schema, and integration contracts when code or an authoritative schema is not already the better source.
- `context/`: non-obvious subsystem context, operational assumptions, and known constraints.

Create a directory only when its first real document is needed. Keep temporary plans, evidence, reviews, and handoffs in the root-level, locally ignored `local-workspace/`.
