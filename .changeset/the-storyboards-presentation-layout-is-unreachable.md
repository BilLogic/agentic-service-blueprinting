---
'agentic-service-blueprinting': patch
---

The storyboard's presentation layout is unreachable.

`BlueprintStepStoryboard` kept a second panel behind `presentation={true}`.
Nothing passed that prop — the only caller is the compare cell, which used
the default cell face. Wiring the walkthrough onto that branch would have
meant migrating a working layout onto dead code. The prop, the branch, and
the panel are gone; the walkthrough's own presentation row is the one that
remains.
