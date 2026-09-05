---
'agentic-service-blueprinting': minor
---

The agent reads the catalogs it could only write into, and every read takes a
service scope.

The deployment's tool roster is this one's plus fourteen. Thirteen of the
fourteen need no migration — `lanes`, `cell_dependencies`, `stakeholders`,
`evidence`, `business_models` and `agent_sessions` are all in the portable core
with the columns these reads select — so the template takes them, under the
deployment's exact names, descriptions and argument schemas.

**Nine reads.** `list_references` (the rulebook vocabulary, live),
`list_lanes` (the lane labels actually in use, distinct from the lane-roles
doc, which says what the roles MEAN), `list_cell_dependencies` (the read half
of `create_cell_dependency` — the agent could write an edge it had no way to
read back), `list_stakeholders`, `list_evidence` / `get_evidence`,
`get_business_model`, and `list_sessions` / `get_session`. The last two read
the session store the switcher reads rather than `agent_sessions`, which is
deliberately narrower than RLS permits: the agent sees exactly what the user
sees.

**Four writes.** `create_stakeholder` / `update_stakeholder` and
`create_evidence` / `update_evidence`, each dispatching onto the same wrapper
the panel calls, so the ledger entry and the captured inverse come free.
`updateEvidence` is new — an edit with no inverse would have been the one
change in the session log that could not be taken back — and lands with its
`WriteFn`, its describe line and its revert case.

**That gives evidence an owner.** CONTEXT.md's ownership table said
**nobody** wrote `evidence`, and that was a fact about the roster rather than a
position: the panel was its only writer. `who-writes-what`'s rule 2 — every
write tool naming one of these records is assigned an owner — is what forced
the answer rather than letting the row go quietly stale. Evidence belongs to
**the cell**: the claim the source grounds, and the one thing every evidence
row the agent can write names.

**Scope replaces the cache.** `registry.ts` held one `cachedServiceId`,
resolved once and reused for every write. It is gone. Reads take a
`ServiceScope` through `resolveServiceScope` — the tool's own `service`
argument first, then the creator's `serviceScope` setting, and always `all` on
a deployment with one service, so single-service behaviour is byte-for-byte the
unscoped read it was. Writes land on `resolveActiveServiceId`, the service on
screen. `list_scenarios` and `list_stakeholders` carry the filter: the first by
`phases.service_id`, because the journey is the hard per-service boundary; the
second by ADR 3's implicit-membership join, because the shared catalog has no
`service_id` to filter on. `readScope.test.ts` pins both.

**The no-database trial keeps its arm.** Every new read answers with a null
client. `list_lanes` and `list_cell_dependencies` gained sample readers over
the bundled board; `list_references`, `list_sessions` and `get_session` never
had a database behind them and serve the same implementation the live app does.
`list_stakeholders`, `list_evidence`, `get_evidence` and `get_business_model`
are deliberately off the trial roster — the sample is a board, not a
deployment, and it carries no cast, no provenance and no business model — so
they land on the honest "no database connected" sentence rather than an
invented empty one. `sampleTrial.test.ts` now walks every registered data tool
through a null client.

Out of scope, and named so nobody looks for them: `search_blueprint` (needs a
`public.search_blueprint` RPC this kit has no migration for), the
`list_blueprint` name (this repo keeps `list_scenarios` — it names what it
returns), the reference-doc import seam (the deployment's nineteenth doc,
`blueprint`, has no file here, so `REFERENCE_NAMES` stays at eighteen) and the
localStorage prefix (the template's `sb-` against the deployment's own).

Thirteen agent tool names are contract identifiers in `identifiers.json`, so
this is a minor. No existing identifier moves, and no path in
`check-reference-paths.mjs` does.
