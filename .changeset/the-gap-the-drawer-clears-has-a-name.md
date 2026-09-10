---
'agentic-service-blueprinting': patch
---

The gap the detail drawer clears has a name, and a test that keeps it honest

`CELL_DETAIL_PANEL_BOTTOM_CLASS` was `!bottom-[61px]` with no way to check 61
against the thing it clears. It is the bottom canvas chrome plus the same 16px
breathing room the top gap already names, so it is now
`CELL_DETAIL_PANEL_BOTTOM_GAP_PX` and the literal stands beside it.

The literal has to stay a literal. Tailwind reads SOURCE text, so an arbitrary
value built by interpolation — `` `!bottom-[${GAP}px]` `` — produces a class
the compiler never saw, no rule is generated, and the element silently keeps
its unstyled position. That is not hypothetical: this drawer shipped that way
once, with the constant right, the class inert, and the panel running under
the annotation toolbar.

So the contract that arrives with it checks two things — that the one literal
and its constant agree, and that no source file anywhere assembles a Tailwind
arbitrary value at runtime, so the next one fails in a test rather than on the
canvas.
