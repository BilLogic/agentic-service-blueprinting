---
'agentic-service-blueprinting': patch
---

**`list_scenarios` is retired.** It was an alias of `list_blueprint` at
`granularity ["phase","scenario"]`, kept for one release so a caller that had
learned the old name still got an answer; its own description said it would go
after that release, and this is that release. `list_blueprint` answers the same
question, and says which rung it is answering at.

The name is gone from the tool table, both dispatchers, the three rosters, the
canvas adapter's read surface, the identifier manifest and the evaluation
harness. A model that still emits it gets the same refusal any unknown name
gets, which names the tools that exist.

**Upgrading a deployment:** if your agent doctrine or your own harness cases
name `list_scenarios`, replace it with `list_blueprint` and a granularity. A
deployment that already retired the alias has nothing to do.
