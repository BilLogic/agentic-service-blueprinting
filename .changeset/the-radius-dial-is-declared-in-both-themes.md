---
'agentic-service-blueprinting': patch
---

The radius dial is declared in both theme files, not one.

`--radius` was declared in `styles/themes/light.css` and nowhere else. It
reached dark mode anyway, because that file's selector list opens on a bare
`:root`: everything in it applies under `.dark` too, and dark never took it
back. The corner radius was therefore correct in both modes for a reason
nobody wrote down, and one that reads the same as a mistake.

The same mechanism has already shipped a defect here. `--surface-hue` is
declared only in the light file, so the warm `34` it carries is what every dark
surface runs on — invisible today because `--chroma` is `0` and every surface
is an exact grey whatever the hue says, and documented in
`styles/themes/dark.css` only after `tokenModel.resolveValue` corrected the
claim the comment there used to make. A mode-invariant value parked in the
leaky spot is the next one of those waiting to happen: it looks deliberate
from the light file and is unreadable from the dark one.

`styles/themes/dark.css` now declares `--radius: 0.625rem`, the value the light
file has always carried, so both files answer the question and the selector's
behaviour stops mattering for it. That is the rule `--hue` already follows — it
is stated identically in both files, and both say in a comment that it is
mode-invariant. Nothing about what renders changes: radius resolves to
`0.625rem` in either theme, before and after, and print is untouched because
`styles/print.css` restates thirteen dials and radius is not among them.

`styles/tokens.test.ts` gains the invariant behind that arrangement. A
mode-invariant dial is one whose own theme file wins in its own theme — so
removing `--radius` from either file fails, because the survivor would then be
leaking across to cover for the missing one, which is the arrangement the rule
exists to forbid — and the two declarations must resolve to the same value.
`--hue` and `--radius` are the two named today, and a third is a string. It
replaces an assertion that only asked whether light declared radius at the
root, which the leak satisfied.
