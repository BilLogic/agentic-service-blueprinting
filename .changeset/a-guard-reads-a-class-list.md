---
'agentic-service-blueprinting': patch
---

Add a class-list reader that matches a token in any order.

A type rule is almost never about one utility. "Labels are medium" is
`text-xs` + `font-medium` together; "an eyebrow is register 3" is
`font-mono` + `uppercase` + `tracking-*` together. A guard that searches
for a quoted string is defeated the moment those classes are reordered
or split across `cn()` arguments — which is how the tree actually
writes them.

**The reader takes a class list, however the call site spelled it**, and
answers whether every class of a token is present, in any order. Three
spellings, and all three are one list: a single `className="…"` string,
arguments of `cn()`, and a class inside a conditional. Named constants
such as `PANEL_TEXT.meta` expand, so `cn(PANEL_TEXT.meta, 'truncate')`
is the named list plus `truncate`, not the extra class alone.

**It enforces no rule of its own.** It is the seam the weight guard, the
mono-register guard and the rung roster are written with. What it
cannot see, no rule built on it can fail.
