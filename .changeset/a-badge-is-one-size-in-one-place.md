---
'agentic-service-blueprinting': patch
---

A badge is one size, in one place.

`PathLabelBadge`, `PathKindBadge` and `ScenarioTitleBadge` each wrote their
own height, padding and type scale around `<Badge>`, and the three did not
agree: all three called the small shape `compact` and all three meant
something different by it. `ui/badge.tsx` now carries a `size` variant —
`default`, `fitted`, `roomy`, `comfortable` — and the wrappers name a shape
instead of deriving one. Same pixels, pinned by `badgeGeometry.test.tsx`,
and a deployment's `one-badge-one-size` contract holds without an exemption
for these three files.
