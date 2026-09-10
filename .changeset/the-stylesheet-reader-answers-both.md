---
'agentic-service-blueprinting': patch
---

The stylesheet reader answers a question about stylesheets: `tokenModel` gains
`stylesheetMatching`, the counterpart to `sourceMatching` it never had.

**Every rule built on this model could read the application and not the
stylesheet it is written beside.** `sourceMatching` sweeps `src/**.ts(x)` and
reports a `file:line: match` for each hit, and that is how the token discipline
rules find a raw hex or a forbidden tier. A stylesheet was outside the sample
entirely, so `semantic.css` was free to spend a primitive that the same rule
forbade a component to touch, and the rule would pass while saying nothing.
Widening the model once widens it for every rule that asks, which is what the
seam exists for.

**Declared values, not raw text.** A text scan of these files is wrong here in
a way that is easy to miss: this codebase writes a paragraph of prose above
almost every block, and those paragraphs quote the names they explain.
`colors.css`'s header spells `var(--color-amber-100)` twice to explain the
Tailwind namespace split, in a file that paints nothing — a text scan reports
both, the first rule written on it fails on a comment, and the next reader
learns the rule cannot be trusted. `stylesheetMatching` walks the declarations
the model already parses, whose comments are blanked upstream, so a paragraph
about a name is not a use of it.

**A match carries where it came from, not just which file.** Each `StyleUse`
reports the matched text, the property whose value carried it, the selector
that declaration sits under, the file and line on disk, and the token layer —
so a rule can say "not at the semantic tier" rather than naming the files that
happen to be semantic today, and can tell `theme.css` registering a step
(`--color-blue-900: var(--color-blue-900)`) apart from `semantic.css` spending
it on `--annotation-selected`.

**What holds it.** Seven cases in `lib/tokenModel.test.ts`, all against this
repo's own stylesheets rather than a fixture: the prose in `colors.css` is not
a use, a declaration's left-hand side is not a value, a reported line is the
line the match sits on in the file on disk, the layer arrives with the match,
the carrying property and selector arrive with it, and a `calc()` reading two
elevation names reports both rather than the first. A raw-text reimplementation
of the same signature fails four of them.

**`Medium` and `Scope` are asserted rather than assumed.** They are the second
and third question a rule asks after "which theme" — which cascade, and which
subtree — and a reader that grew reach while quietly losing either would answer
more questions and fewer of the ones already asked. Two cases now hold them:
`--surface` flips between `themes/dark.css` and `print.css` with the medium
while `--color-blue-900` flips the other way, and `--ground` resolves to one
value at the root and another at `[data-ground='card']`, with the scope taken
from the stylesheet rather than written down beside it.
