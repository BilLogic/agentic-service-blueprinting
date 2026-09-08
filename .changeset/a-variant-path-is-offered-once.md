---
'agentic-service-blueprinting': patch
---

A variant path appears once in the path picker, in the column beside the happy
path, instead of twice — once on each side.

The picker lays its paths out in columns, and it decided which column a path
belonged to by filtering the same list against two sets of kinds, `happy` and
`variant` on the left, `variant` and `exception` on the right, and treating the
two results as disjoint. They were not. `variant` was in both, so every variant
path was drawn in both columns: two checkboxes, the same label and the same
swatch on each, toggling the same filter, with no way for a reader to tell that
they were one path.

The overlap is residue from the migration that took path kinds from four to
three. `unhappy` and `alternative` were two spellings of one idea and both
became `variant`, on the reasoning the migration states itself: `exception`
already carries "this went wrong", so `unhappy` was only ever `variant` with a
mood attached. Before that fold the two sets were disjoint and the split meant
something — `alternative` on the left, `unhappy` on the right. Putting the new
spelling in place of both old ones put one value in both sets, and a `Set`
takes a repeated member without complaint, so the day the split stopped being
a split, nothing said so.

Which column a path belongs in is now answered by a single total map from kind
to column, consulted once per path — not by asking each column in turn whether
it wants the path. That is what the two sets could not be: every kind is
assigned, because the map is a `Record` over the kinds and the compiler will
not accept a gap, and each is assigned exactly once, because a repeated key is
a syntax error rather than a silently absorbed duplicate. Assigning a kind to
two columns is no longer a mistake that renders; it is a thing that cannot be
written down. `variant` is assigned the primary column, beside the happy path,
which is where the fold leaves it: after the fold a variant is the alternate
route and `exception` is the whole of what goes wrong, so the secondary column
holds exceptions alone. A path whose kind this build does not recognise still
gets a column, so that a newer schema's row is drawn rather than dropped.

The test is the invariant the defect broke, and it is not a census: for every
short arrangement of the kinds the app declares, everything handed to the
grouping comes back out of it exactly once, with nothing dropped and nothing
invented. It names no kind and no column, and it does not say how many kinds
there are — a fourth would be a migration, and it should not also be an edit
to this test.
