---
'agentic-service-blueprinting': minor
---

The slide card names its fields, offers removal where it can be seen, and the
slide sheet is draggable.

**Labels.** The card had no `<label>` at all — both fields were placeholders,
and a placeholder disappears the moment somebody types. A filled card was two
unnamed boxes, and a screen reader got a hint rather than a name. Narrative
takes a visible one in the schema's word; the title takes an accessible one,
because the number and the strip beside it already say which slide it is.

**Removal.** An uploaded illustration could only be removed by right-clicking
it: invisible, absent on a touch screen, unreachable by keyboard. Every
upload now carries a visible remove button. Frames do not — a frame belongs
to its cell and cannot be removed from here.

**Height.** The slide sheet was a fixed 224px. Five slides citing three cells
each is more than that, so the rows that did not fit were reachable only by
scrolling inside a strip that also scrolls sideways — two axes in one small
box, on the surface where slides are written. Its top edge is now a drag
handle, in the same idiom `AgentDockDivider` already uses, and the height is
remembered.
