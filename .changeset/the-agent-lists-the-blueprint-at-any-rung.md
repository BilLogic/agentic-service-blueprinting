---
'agentic-service-blueprinting': minor
---

The canvas agent gains `list_blueprint`: the complete set of phases, scenarios, paths, steps, lanes or cells — any mix of them — with ids, in the order a person reads the board. It takes `phase` and `scenario` by name, `kind` for paths, `lane_role` for lanes and cells, and the shared `service` scope, and returns every matching row up to `limit` (default 200, at most 500) under a header with the true total, so a clipped list says it was clipped. It is a plain list: no query and no ranking. A word outside a vocabulary (a rung, a path kind, a lane role) is refused with the list rather than read as a filter that matches nothing. It reads the tables the board already reads, over plain PostgREST, a page at a time so the total survives the server's row cap, and needs no new database function. The no-database trial answers it from the bundled sample through the same walk and the same text.

`list_scenarios` is now an alias of `list_blueprint` with granularity `["phase","scenario"]`, and its description says so. It stays for one release and is then removed. Its output takes the list's row shape. An earlier release recorded that the journey read would stay `list_scenarios`; this reverses that.

`LANE_ROLE_FILTER_PARAM` is exported from `src/lib/agent/tools/specs.ts`, built from `CANONICAL_LANE_ROLES`, and held to the lane-role constraint by the lane-role roster test. `listScenarios`, `sampleListScenarios` and `formatScenarioList` are removed; use `listBlueprint`, `sampleListBlueprint` and `formatBlueprintList`. The canvas adapter names `list_blueprint` in its read and service rows, and the eval harness answers both names.
