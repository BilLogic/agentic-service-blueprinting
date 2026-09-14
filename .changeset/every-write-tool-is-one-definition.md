---
'agentic-service-blueprinting': patch
---

**Every write tool is one definition, and the dispatcher is a lookup.** The
twenty writes — `create_phase` through `update_finding` — each live under
`src/lib/agent/tools/definitions/`, grouped by the noun they act on beside
the reads of the same noun: a write is its zod schema, the mutation module
it calls, and the sentence it replies with, and nothing else. `TOOL_SPECS`
is now a projection of the definition list; the spec table declares nothing
of its own, and `registry.ts` holds no switch.

A write runs attributed to its session through `ctx.session.attributed`,
which is the ledger's own `attributedTo(sessionId, work)` — scoped, so no
caller can leave attribution on after a throw. The module-global set/clear
pair (`setAgentAttribution`) is gone. The tool layer makes no table query of
its own any more: the occupancy guard before a cell create, the pre-read a
partial cell edit needs, and the read-modify-write behind a stakeholder or
slice patch each moved behind the mutation module that owns the row
(`createCell`, `readCellBeforeEdit`, `patchStakeholder`, `patchSliceMeta`).

Two argument schemas say what their handlers always enforced. `kind` on
`create_evidence` / `update_evidence` is an enum of the eight evidence kinds
(the value now exported from the evidence module as `EVIDENCE_KINDS`), and
`kind` on `create_stakeholder` / `update_stakeholder` is an enum of the four
actor kinds — a `team` is still never written by the agent, and an existing
team row is still edited with its kind carried through. `kind` on
`create_cell_dependency`, `source` on `create_finding` and the path kinds are
refused outside their enums with the schema's words rather than coerced to a
default. `create_slice` and `update_slice` still read `description` as
`summary` for a model taught the old wire; the alias is declared on the
definition and the schema does not advertise it.

**Upgrading a deployment:** if your tree carries its own copy of `specs.ts`
or `registry.ts`, take the package's — both are now small. A test of your own
that drove a write through the dispatcher against a stubbed client can now
build a context by hand and run the definition; a test that stubbed
`@/lib/cellContentMutations` for the agent's cell create should stub
`createCell` as well as `updateCellContent`.
