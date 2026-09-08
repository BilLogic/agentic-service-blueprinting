---
'agentic-service-blueprinting': patch
---

A blueprint cell's lane rule states five properties, not seven:
`--background-blueprint-cell-origin` and `--ring-blueprint-cell-soft` are gone,
because neither carried a value of its own.

Both had readers, which is what made them look real. The button's `blueprint`
variant chained through `-origin` on its resting and hover fills and through
`-soft` on all three of its ring, border and pressed-ring colours, and the
board's preview-hover and connected-emphasis rules read one apiece. But every
link in every one of those chains was a `var(name, fallback)`, and the fallback
was the twin: `-origin` falling through to `--background-blueprint-cell`,
`-soft` to `--ring-blueprint-cell`.

So the question was only ever whether some role gave a twin a different value.
Measured through the token model across all sixteen role blocks — nine lanes
and seven touchpoint tones — in both themes: sixteen of sixteen identical for
each pair, textually and as resolved sRGB. Every chain resolves to the same
colour with the two names absent and the fallback taken, so nothing on the
board changes.

Two names for one value is what one authored accent per role exists to remove,
and the same deletion already stands in the deployment this design system is
shared with. The lane rule now reads the same in both.
