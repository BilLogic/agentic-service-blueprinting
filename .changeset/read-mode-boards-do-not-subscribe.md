---
'agentic-service-blueprinting': patch
---

A read-mode board no longer subscribes every lane overlay to the combined
navigation context. `BlueprintLaneHandles` read the editor and the scenario
level before deciding it had nothing to draw, so a reader who can never author
paid for a subscription per lane on every board. The gate moves above the
hooks, and the part that needs them is a second component mounted only while
authoring.

A phase section also stops calling itself navigable when nothing is listening:
without an `onNavigate` a click does nothing, and the affordance was a promise
to a pointer and to a keyboard that the section could not keep.
