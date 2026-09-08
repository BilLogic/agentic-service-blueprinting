---
'agentic-service-blueprinting': patch
---

The same-column detour test cites no issue number, so it can be held identical
across both repositories that read it.

Its header opened by citing a bare number for the arrowhead bug it was written
for. That number addresses a different ticket in each repository — here it
belongs to the release tooling — and the deployment's drift gate refused to
enrol the file for exactly that reason. The engine the file tests is enrolled,
so the implementation was held to one copy while the test pinning its head
direction was not, and could drift.

The citation is replaced by what it stood for, named in prose: the bug where a
detoured connector's head pointed the wrong way, measured at eleven arrows on
one board of a deployment built on this template. Comment-only; the test's
behaviour is unchanged.
