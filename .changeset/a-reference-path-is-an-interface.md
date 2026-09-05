---
'agentic-service-blueprinting': patch
---

A reference path is an interface.

A deployment imports twenty-two of this repo's documents by fixed path at
build time from a pinned tag — eighteen references and the four skill
bodies. Nothing here guarded those paths: a move landed green and was found
at the consumer's build. `check:reference-paths` holds the list and fails
this repo first, and ADR 0004 records the rule: moving one is a version bump
plus a matching consumer change, never a silent move.
