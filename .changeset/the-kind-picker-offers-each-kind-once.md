---
'agentic-service-blueprinting': patch
---

The create-version dialog's Kind picker offers three kinds, not four — Variant
is one button now, and the console it warned in stays quiet.

`PATH_KINDS` listed `variant` twice. It is residue from the change that
collapsed `unhappy` and `alternative` into the single `variant` the database
has accepted since `paths_kind_check` was rewritten: both old spellings were
substituted for the new one, and the roster ended up holding it once for each.

Nothing failed, and the shape of the roster is why. The kind union is derived
from the array, and a union dedupes on the way out, so the type stayed correct
and the compiler had nothing to say. Every label and colour map is a
`Record<PathKind, …>`, and a repeated key there is a syntax error, so those
defended themselves. Only the array is iterated — the picker draws one button
per entry — so the duplicate surfaced in the one place it could: two buttons
reading Variant, doing the same thing, and React warning about two children
sharing a key.

The same substitution left the same mark in two more rosters, found by looking
for it. The blueprint arrow markers keep their own list of kinds and it also
held `variant` twice; that one is only ever turned into a lookup map, so the
second entry overwrote the first with the same value and nothing was visible.
The agent's `create_path` and `duplicate_path` schemas held it twice as well —
and alongside it `named`, a fourth value that is not a kind, that no map keys,
and that the database refuses. That one had teeth: it was offered to the model
as a legal choice, and picking it built a row the insert would have rejected.
Both schemas now offer the three kinds the constraint accepts, and their
descriptions name those kinds rather than the retired spellings.

The assertion that holds this is an invariant rather than a count. It says each
roster lists each of its members once, that the rosters and the compiler-guarded
maps hold the same members as each other, and that a tool-schema enum which
speaks the path-kind vocabulary speaks nothing else. Nowhere does it say there
are three kinds — a fourth would arrive as a migration and a decision, and this
test should not have to be edited when it does.
