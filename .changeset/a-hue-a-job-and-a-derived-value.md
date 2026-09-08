---
'agentic-service-blueprinting': patch
---

The two exemptions in the var-resolution rule are named, and the divergences
from upstream are written down together.

The rule that every bare `var()` in a stylesheet resolves to a real declaration
has been here since the design-system port, and it already permitted both
things it has to permit. Neither said so. `var(--x, fallback)` was excused by a
comment; a token a component sets on its own element was excused by nothing at
all — it rode on the token model folding stylesheet and TypeScript declarations
into one set, and a tidy-up that made the rule stylesheet-only would have
condemned three live references in `blueprint.css` with nothing to point at.
Both arms are now named at the rule, each is asserted to still be carrying
something, and the predicate is exercised on references it did not read off
disk: a dangling name fails in either kind, the override seam passes only in a
stylesheet, and a component's own declaration counts as a declaration.

`docs/adr/0008` records the vocabulary's relationship to the system it was
ported from: a primitive is named for its hue, a semantic token for its job
with no ramp number, brand is not a hue, and where upstream wrote a literal we
derive while taking the judgement behind it. Five divergences are stated with
the measurement behind each — the stepped scales, the two brand words, the
focus ring, the radius dial, and the alert border, where the judgement that an
edge should be quiet is taken and the ramp step it is spelled with is not.

`semantic.css` said the role ramps were per-theme literals in the theme files.
They were removed with the rungs; the header now says so.
