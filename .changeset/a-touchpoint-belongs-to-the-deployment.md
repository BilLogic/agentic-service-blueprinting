---
"agentic-service-blueprinting": minor
---

A touchpoint belongs to the deployment, and a placement links to one inline.

**⚠ A column is dropped. Apply `21000131000000` before generating a seed from
this checkout.** `touchpoints.service_id` is gone and uniqueness moved from
`(service_id, name)` to `(name)` across the whole deployment. The seed
generators stop emitting the column, so a seed built here needs a target that
has applied the migration — the ordinary rule that migrations land before the
artifacts built from them, stated because this is the first drop the seed
shape follows.

This finishes ADR 0003 rather than reversing it. That ADR decided the catalog
of nouns a journey references is one deployment-level pool and landed only the
actors: `stakeholders` was born with no `service_id` in `21000125000000`, while
`touchpoints` kept the service scope it was born with. The ADR's own
consequences say the tools "make the same move in a later migration", and that
the argument belongs in the file that drops the column. `21000131000000` is
that file, and it carries the argument. `CONTEXT.md`'s touchpoint entry
reverses with it, as that ADR said it would.

The migration folds before it drops, which is the one place it differs from
the deployment this template was generalised from. That deployment holds a
single service, so `unique (service_id, name)` and `unique (name)` were already
the same constraint over its rows and the column could go outright. A template
cannot assume that: an adopter may hold several services, each with its own
"Zoom" row. So every placement is repointed at the oldest row of its name, the
survivor takes any description it was missing from the rows folding into it,
and the rest are deleted — licensed by the rule the ADR states, that an
identical name means the identical thing. On a single-service database the fold
matches nothing.

`sync_cell_touchpoints` and `set_placement_touchpoint` are rewritten from
`pg_get_functiondef` rather than restated, so the three migrations that already
edited those bodies cannot be reverted by hand; each replacement is asserted,
and the finished body is swept for the word. The other three placement
functions never named `service_id` and are untouched, and neither rewrite is
re-granted — `create or replace` keeps a function's ACL, and the migration
asserts that in the recipe half rather than re-stating it.

What moved with it:

  `src/hooks/useRegistryTouchpoints.ts`   the read is unscoped; the cell →
                                          path → scenario → phase join went
                                          with the column
  `src/types/database.ts`                 `service_id` off Row/Insert/Update,
                                          and the relationship it keyed
  `scripts/generate_seed_sql.py`          mints a registry row with no service
  `scripts/generate_sample_blueprint.mjs` the same, and upserts the registry
                                          rather than letting a service delete
                                          cascade to it
  `scripts/check-seed-loads.mjs`          `@registry` is the unscoped read the
                                          hook now makes
  `references/data-model.md`,             the registry is one pool, unique by
  `docs/erd.mmd`,                         name across the deployment
  `docs/connectors/supabase/database.md`

**A placement offers its own link to the registry.** `RegistryLinks` — one
block listing a cell's name-only placements, each a bare select and two
buttons — is replaced by `RegistryLink`, one card per placement, adopted from
the deployment this template was generalised from. Two things come with it.
The card names the placement it is about, so the sentence can say which name
the registry lacks. And the list is filtered by the names the cell's text
already shows: offering one of those produced a link the database refuses
("that cell already shows that touchpoint"), so the entry is left out of the
list instead of failing on the click. The ledger write and its inverse were
already in `src/lib/placementLinkMutations.ts` and are unchanged.

`Registry` is a new panel label, so `scripts/interface-schema-map.mjs` binds it
to `cell_touchpoints.touchpoint_id` — the same split `Actor` draws over
`lanes.stakeholder_id`, where the label is the pool and the name is the pointer.

The journey read is `list_scenarios` and stays that way. The deployment's queue
settled the name against `list_blueprint`, which this repository never carried:
`READ_TOOL_NAMES`, `TOOL_SPECS`, `identifiers.json` and
`references/canvas-adapter.md` all already say `list_scenarios`, and
`check:read-surface` holds the document to the set. Recorded here so the
question is answered rather than open.
