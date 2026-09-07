---
'agentic-service-blueprinting': minor
---

A touchpoint names its owner.

`21000131000000` made the touchpoint registry the deployment's and wrote its own
promissory note in the header: "A touchpoint will carry a `stakeholder_id` — its
owner. […] The link waits for both ends to be the deployment's, and after this
file they are." Both ends are, so `21000201000000` adds the link.

`touchpoints.stakeholder_id` is a nullable `uuid` referencing
`public.stakeholders (id)`, with `touchpoints_stakeholder_id_idx` beside it and
`update (stakeholder_id)` granted to `authenticated` in the recipe half. Null is
the ordinary state, not a gap: `sync_cell_touchpoints` mints a registry row from
a cell's text with no owner at all, and "nobody has said yet" is what that row
means.

The delete action is `set null`, which is where this file deliberately parts
company with the deployment it generalises. The deployment writes the reference
with no delete action — NO ACTION, so removing an actor who owns a touchpoint is
refused — while `lanes.stakeholder_id` in `21000125000000` already committed
this template to the opposite rule, in as many words: "an actor taken out of the
cast un-names its lanes rather than pinning itself." Carrying the deployment's
shape across would leave the cast holding two contradictory opinions about what
deleting an actor means, un-naming lanes and refusing touchpoints in the same
breath. One rule, applied to both things that reference the cast. The migration
asserts the delete action rather than merely describing it, so the choice cannot
quietly drift back.

Nothing authored moves. An IR describes one service and has never had a field
for who owns a tool, so `registryTouchpoint` is unchanged and the schema version
stays where `21000122000000` left it — the stance `21000123000000`,
`21000130000000` and `21000131000000` each took. Both seed generators write
`(id, name, kind, summary, url, origin)` and are unaffected by a nullable column
they do not name.

The ERD, `references/data-model.md` and the Supabase connector's column table
gain the column and the `stakeholders |o--o{ touchpoints` edge. While there,
`references/data-model.md` loses a stale `services ||--o{ touchpoints : "registry"`
edge that `21000131000000` should have taken with it when it dropped
`touchpoints.service_id` — the ERD had already been corrected, and the two
diagrams disagreed.
