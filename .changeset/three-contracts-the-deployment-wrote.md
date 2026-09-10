---
'agentic-service-blueprinting': patch
---

Three contracts written against this template's own code, in a deployment built
on it, now run here: the DB-wins merge in `resolveBlueprintForScenario`, the
compare that weighs a cell's touchpoint placements, and the write gate's three
published flags. All three passed unmodified — they were held there only
because nobody had run them here.
