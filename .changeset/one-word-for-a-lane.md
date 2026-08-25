---
'agentic-service-blueprinting': minor
---

The schema speaks the vocabulary the rulebook already taught. Ten renames:
`layers` → `lanes`, `cells.layer_id` → `lane_id`, `layers.layer_role` →
`lane_role`, `cell_triggers` → `cell_dependencies`, `service_lifecycles` →
`services` (and `service_lifecycle_id` → `service_id`), `service_scenarios` →
`scenarios` (and `service_scenario_id` → `scenario_id`), `row_position` ·
`column_position` · `slot_position` · `order_position` → `position`, and
`description` → `summary` on services, phases, scenarios, paths and cells.

The package was half-renamed and contradicting itself in one statement:
`create or replace function public.add_lane` inserted into `public.layers`.
`references/data-model.md` — what the canvas agent reads before touching data
— was already 100% the new vocabulary, so the agent was taught a schema its
own backend did not have.

Breaking for anyone holding data or calling the RPCs directly. Table and
column names, `upsert_cell(lane_id)`, `add_lane(lane_role, at_position)`,
`create_phase(summary)`, and the IR's field names all move. The database now
carries a `schema_version` row saying which shape it is, so a mismatch is a
named error instead of a column that is not there.

Not renamed, deliberately: `cell_dependencies.kind` keeps `('trigger',
'needs')` — "trigger" there is one of two kinds of dependency, not the
container; `slices.description` stays, because a slice's description is prose
about the slice rather than a one-line gloss of a row; and the
`tech_description` link payload keeps its `description`.

Upstream migrations are now allocated from a reserved timestamp band
(`21000101000000`–`21991231235959`) so a fork's pull can only ever append.
