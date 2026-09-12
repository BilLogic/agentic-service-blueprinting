---
'agentic-service-blueprinting': patch
---

Ink is named, never dialled. Every authored surface outside the vendored
`components/ui/**` wrote its text colour as one of three rungs —
`text-foreground`, `text-muted-foreground`, `text-tertiary-foreground` —
in place of 68 opacity dials at eight different lightnesses across 39
files. A lightness could not be read back: nothing said whether `/70` and
`/75` were two jobs or two afternoons, and an opacity composites against
whatever sits behind it, so the same class was a different colour on a card
than on a page. `typeInk.ts` holds the rule at the class-list seam and names
the rung to write instead, and ADR 0012 gains ink as a fifth axis.
