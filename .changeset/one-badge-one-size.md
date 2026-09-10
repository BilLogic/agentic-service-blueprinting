---
'agentic-service-blueprinting': minor
---

A badge's size is decided in `ui/badge.tsx`, or at every call site at once

`ui/badge.tsx` offers four closed sizes. Seven call sites ignored them and
wrote the geometry themselves — three distinct shapes, two of them below every
size the variant offers, so a badge in the editor chrome was smaller than the
same badge anywhere else for no stated reason. Each was written in isolation
against a shape someone else had already chosen, which is the failure review
cannot catch: every one of those diffs looked reasonable alone.

The seven overrides are removed and the badges take the variant's `default`.
Visible in the editor chrome, the canvas design tools, the developer portal
and the slide artboard.

Removing them is the afternoon; keeping them gone is the point, so
`scripts/tests/one-badge-one-size.test.mjs` arrives with them. Its subject is
what a call site passes to a badge — not a sweep for `text-2xs`, which would
need an exemption for every span that legitimately has one, and an exemption
list is where a real finding hides. Wrappers that forward their `className` to
a badge are DISCOVERED rather than listed, so the next one is covered the day
it is written rather than the day someone remembers the list.
