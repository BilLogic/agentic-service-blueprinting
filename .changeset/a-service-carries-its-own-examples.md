---
'agentic-service-blueprinting': minor
---

A service carries its own examples through the authoring pipeline

`public.services.entity_examples` — one free-text example per core kind, shown
under that kind's generic definition so a reader is grounded in this deployment
rather than the textbook — has existed since `21000123000000`, which also
granted it to a signed-in author. The wire format never learned it. So the
column was writable from the editor and invisible to the pipeline that writes
the same rows: `references/ir-schema.json` did not model it, and
`scripts/generate_seed_sql.py` emitted `insert into public.services (id, name,
summary)`. An example authored in a blueprint source was dropped on the way to
the seed, and a re-map wrote nothing where a deployment had something.

The IR now models an optional `entity_examples` map on the service — a kind key
to a locale map, absent is legal — and the generator carries it into the service
insert and the conflict clause. The key set is deliberately not an enum: the
kinds belong to the app, which states them once where the definitions live, and
the column carries no CHECK for the same reason.

**What the conflict clause does with silence, and why.** A service block with no
examples generates `'{}'`, and so does one that authored none — by the time the
seed exists the two are indistinguishable. Overwriting on `'{}'` would erase
what a deployment authored from the editor, which is the same silent loss as
never emitting the column at all. So an empty map reads as *the source said
nothing* and leaves the target alone. A map that IS present is the whole truth
for the service: a kind it omits is cleared, so the generator can still remove
an example — by authoring the map without that kind, never by emptying the map.
The reason sits beside the clause, where a reader wondering about it will be.

Proven by a round trip rather than by reading the generated SQL, because the
column is written from two places: `scripts/tests/entity-examples-round-trip.test.sh`
replays the schema, loads a generated seed and reads the row back — an authored
example arrives, a re-map leaves it alone, a source that says nothing keeps what
the deployment has, and a source that speaks clears the kind it omits. It fails
on the previous generator, naming the example that never arrived, and fails
again if the guard is replaced by a plain overwrite. `scripts/tests/run_tests.sh`
holds the half a machine with no database can hold: the column is in the insert,
the text is the seed's own locale's, and the guard is still spelled.

IR schema version `2026.09.11`. The step is a stamp — the map is optional and
nothing authored moves — and no migration stamps the version, because the
database has had the column all along, so a target at an earlier version stays
compatible. The stamp moves at all because a version names a shape, and
`2026.09.10` refuses a key this one accepts.

This is the upstream half. A deployment built on this template regenerates its
committed seed only after bumping its pin to a release carrying this change;
changing either side alone reddens the drift gate — immediately in one
direction, and at the next pin bump in the other.
