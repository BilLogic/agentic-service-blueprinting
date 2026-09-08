---
'agentic-service-blueprinting': patch
---

A dependency row's why-line is revealed rather than always drawn.

`linkNote` says why an edge exists. Read one row at a time it earns its place;
rendered statically down a list of eight it doubled the height of every row
that had one, and the list's shape started depending on how talkative its
author had been.

It now fades in on hover or focus anywhere in the row, and stays visible where
the pointer is coarse — the rule `NavRowAction` already states, because an
affordance that only exists under a mouse is not an affordance for everyone.
Opacity only: a list whose rows grow under the pointer moves the row being
pointed at. The sentence stays in the DOM at rest, so a screen reader reads it
whether or not anything is hovering.

`cellDependencyWhyLine.test.tsx` pins the three readers that have no hover —
keyboard, touch, screen reader — one test each, because each is a separate
mechanism and any one can be lost to a tidy-up that keeps the other two.
