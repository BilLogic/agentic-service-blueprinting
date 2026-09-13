---
'agentic-service-blueprinting': patch
---

**Every read tool is one definition.** The twenty-three tools on the agent's
read surface — the rulebook, the journey at every level, one scenario's grid,
the compare, cells and their arrows, slices, the cast, evidence, the business
model, sessions and the change ledger, the findings, what the canvas shows and
which controls exist — each now live as a definition under
`src/lib/agent/tools/definitions/`, grouped by the noun they read. Their spec
derives from their own zod schema; they run through `run(args, ctx)`; their
switch cases in both dispatchers are gone. What the no-database trial used to
route through a second switch, each definition decides itself: a tool with a
sample answer gives it when `ctx.client` is null, and a tool with none is not
offered to the trial at all.

Nothing the model sees changes except three things. The required-id arguments —
`name`, `scenario_id`, `slice_id`, `session_id`, `target_id`, `query` — now say
`minLength: 1`, the rule the dispatcher already enforced by hand, stated where
the model can read it. And the read tools now lead the tool list, ahead of the
writes; the order within each group is what it was. And a value outside a
closed list — a `kind` that is not one of the five, a `status` that is not one
of the four, a granularity entry that is not a string — is refused with the
schema's own words rather than the handler's, or, where the handler used to
let it through to an empty read, refused at all.

The script that compared argument names across the two files by regex now
reads a case body only as far as its own function, having lent the last write
case the keys of the function that followed it. It watches the twenty-eight
tools that are still a spec beside a switch case, and retires with them.

**Upgrading a deployment:** if your tree carries its own copy of `specs.ts`,
`registry.ts` or `read.ts`, take the package's. If your agent doctrine relies on
the tool list's order, the reads come first now.
