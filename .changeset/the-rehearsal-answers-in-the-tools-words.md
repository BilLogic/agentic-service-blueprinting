---
'agentic-service-blueprinting': patch
---

**The eval harness's dry-run writes answer in the tool's own words.** A write
in the harness used to be recorded as a dry run and answered with a sentence
the harness composed in the tool's name — one for `create_finding`, and
`Done (<tool> accepted, ref dry-N)` for the other nineteen — which is a
sentence a tool can change without the harness noticing. Now the dry run runs
the tool: `runTool(definition, args, rehearsalContext({ definition, args })
.ctx)`, the same call seam the live loop validates at, against
`src/lib/agent/tools/rehearsal.ts` — a supabase-shaped client that records
what it was asked and answers with `dry-N` placeholders, by the operations a
chain was given rather than by the tool that gave them. The model reads
`Added lane to every path of the scenario. Re-read the blueprint for the new
lane ids.`, and an invalid call is refused with the schema's words the way the
live loop refuses it. The database reads answer in the app's words too: the
harness fetches rows over REST and the app's own formatters say what they read
as, down to each empty state, so the only tool result sentences the harness
still composes are the rehearsal note, the "no browser session store" answers
and a findings total the app's read never asks for. A parity check fails if
one it does not own turns up here again.
