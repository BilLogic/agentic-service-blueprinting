---
'agentic-service-blueprinting': patch
---

A partner lane is drawn as a partner lane, and the fill map stops disagreeing
with the constraint.

`ROLE_STYLES` carried `journey_stage` and `physical_evidence`, neither of which
`lanes_lane_role_check` admits, and had no fill for `partner_actions`, which it
does. So a partner lane fell through to a zone fallback — and both fallbacks are
the support fill, which is why a party outside the service was drawn as one of
its own support teams.

There is now a ninth lane fill, `partner-action`, on the gray family: the only
one neither a lane, a touchpoint tone nor a path draws from. It states all seven
cell state properties and is measured for contrast in both themes like every
other fill.

`ROLE_STYLES` was the fourth copy of the lane-role roster and the only one
nothing held. `scripts/tests/lane-role-roster.test.mjs` now holds it too, by set
equality, so a dead key and a missing canonical role both fail.
