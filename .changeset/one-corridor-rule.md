---
'agentic-service-blueprinting': patch
---

**One Lane corridor rule for both layouts.** `laneCorridor.ts` owns the two
dependency-driven corridor predicates, the three corridor margins and the row
track height; the single board and the side-by-side compare both call it. The
compare's own copy of the predicate — which resolved a canonical row into each
variant while the board's matched by id — and its three renamed wrappers are
gone. One predicate resolves the lane every time, so a single board is
unchanged and a compare asks every variant about the lane it calls by that
name. The cell shell's vertical inset is one layout number both layouts sum
from, and the compare cell reads it as a style rather than a padding class.
