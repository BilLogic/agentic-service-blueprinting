---
'agentic-service-blueprinting': patch
---

A retired kind has no quiet spelling.

`cell_dependencies.kind` has been `leads_to` and `enables` since
`21000114000000`, but two documents still taught the pair it replaced:
`references/canvas-adapter.md` promised "trigger-vs-needs semantics" and
`evals/behavioral/evals.json` graded the whatif skill on whether it "Walks
trigger/needs edges". `check:dependency-kinds` banned those words in their
code-span form and neither wore backticks, so both stayed green for a
release — and a third, the comment beside the adjacency walk in
`slice_tools.py`, was outside the sweep's markdown-only reach entirely.

All three now say `leads_to` and `enables`, and the check has a second
retired-spelling assertion that would have caught them: a short list of
phrases in which the two words can only be dependency kinds, swept over
`references/`, `skills/`, `agents/` and `evals/` — their JSON and Python
included. The phrases are narrow rather than the words, so the integrity
trigger `cells_validate_path_match` and the English verb stay out of reach
without an exemption; `BARE_ALLOWED` holds the two sentence kinds that do
need one, with a reason each.
