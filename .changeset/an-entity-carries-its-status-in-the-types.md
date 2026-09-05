---
'agentic-service-blueprinting': patch
---

An entity carries its status in the types.

`entity_status` has been a domain on `cells.status` and `paths.status` since
migration `21000125`, and `src/lib/entityStatus.ts` has spelled the ladder for
the app the whole time — but no entity in `src/types/blueprint.ts` had a
status, so the board query never selected the column and the normalizer never
mapped it. A status a migration guarantees and no read carries is a column
nobody can see. `BlueprintPath` now requires `status`, `BlueprintCell` carries
an optional one, `PATH_BLUEPRINT_SELECT` asks for both columns, and
`normalizeBlueprint` narrows what comes back through `asEntityStatus` — a rung
the renderer has no treatment for reads as absent rather than as an
unrecognised marker, and a path with nothing said about it reads as `live`.
Both generators emit the same default, so an offline board says what the
database says.
