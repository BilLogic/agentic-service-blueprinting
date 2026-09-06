---
'agentic-service-blueprinting': patch
---

A layer of tokens is not a lane.

`21000104` renamed `layers` to `lanes`, and the prose was carried across by
word replacement, so eleven sentences using `layer` in its ordinary English
sense came out with `lane` substituted into the middle of a word or an
unrelated idea: tabs "laneed" over the base view, rules "deliberately
unlaneed", and the design system's own token tier called "the semantic lane"
in seven places. Every one passed `tsc`, every check and review, because a
comment is the subject of none of them.

The sentences are restored, and the copy sweep is untouched: what `21000104`
retired is the COLUMN, not the English word, and Check C already draws that
line by subject — JSX text and five reader-facing props, comments removed — so
a token tier living in a comment, a module or a stylesheet reaches no reader
and is never read. Narrowing the pattern instead would have let
`aria-label="Add a layer"` through, which is the retired name on screen and
the one case that check plants to prove itself.

A changeset, the CHANGELOG and the guard's own test may quote the residue —
a note explaining the fix has to name both spellings, and a dated record keeps
the words it was written with. Beside Check C now sits a guard on the residue
itself — a word that exists in no
dictionary (`laneed`, `unlaneed`) and one phrase whose meaning the rename
inverted (`semantic lane` with no role after it, which is why `lane_role` and
"semantic lane roles" pass) — over every file a commit would carry, so the
next mechanical rename cannot leave the same wreckage unnoticed.

Four files reach byte-identity with the deployment as a result, and a fifth
carries the decision the module stores were already following: ADR 5,
cross-surface state is a module store, not context.
