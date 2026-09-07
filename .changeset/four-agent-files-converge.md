---
'agentic-service-blueprinting': patch
---

Four of the agent loop's smaller files converge, and the tool lane stops being
a layer.

`attachments.ts`, `role.md`, `sessions.ts` and `providers/openai.ts` are
byte-identical with the deployment. `layer` was the retired spelling in both
repositories' vocabulary lists and this one already said "tool lane" elsewhere,
so that was internal drift rather than a fork.

`sessions.ts`'s comment now carries both repositories' reasons for reading the
session store rather than the table — the security history one side remembers
and the no-database case the other does — each stated without naming a column,
because the schemas fork there.
