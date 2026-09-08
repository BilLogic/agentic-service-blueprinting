---
'agentic-service-blueprinting': patch
---

The rename map says which name became which, and a fold says its destination
once. `scripts/retired-vocabulary.mjs` recorded each rename as a `was` array
beside an `is` array, which reads positionally because nothing else is on
offer — and two parallel arrays cannot express a fold, which is the commonest
kind of rename.

The path-kind row is where that told a lie. It said `unhappy` / `alternative`
on one side and `exception` / `variant` on the other, so the map claimed
`unhappy` became `exception`. `21000116000000` runs one statement —
`set kind = 'variant' where kind in ('unhappy', 'alternative')` — and both
spellings landed on `variant`. `exception` already existed, carries "this went
wrong", and was never a destination; the migration's own note says so. The row
had been carried across from the deployment's map, where the same pair is
correct, because that database's `20260821220000` really did send `unhappy` to
`exception` and `alternative` to `variant`. Two histories, one row, and nothing
holding either against the SQL that ran.

The map is a list of PAIRS now. Each retired name says where it went, several
may name the same destination, and a name that was dropped rather than renamed
says `null` and why. `kept` is the other half of a fold and the half the old
shape had nowhere to put: a value that already existed on the column, kept its
own meaning, and was never landed on. `was` and `is` are derived from the
pairs, so the two lists cannot drift from them or from each other.

Two more rows were reading wrong under the same shape. The placement row paired
`cell_touchpoints.screenshots` with `resources.kind`, and no screenshot ever
became a kind — every url and every screenshot is copied into `resources.url`,
and `kind` is what tells a link from an attachment afterwards. The design
system's row implied `pill` became `badge` and `chip` became `tag`; neither
word maps onto one, which is why the deployment's own `coverContent.chip`
became `commandCopy`. Both now say what happened.

Three readers had inherited the positional guess and no longer do:
`value-set-claims`, which is what tells an author what a retired value became;
`check-database-names`, which names the replacement in its failure; and
`check-instance-vocabulary`, which keeps the old reading only for the
instance's map, whose shape offers nothing else.

`scripts/tests/the-map-is-what-the-sql-did.test.mjs` is the guard. It reads
each row's migrations down to their top-level statements — comments and
dollar-quoted bodies removed — and asks whether the `update` or `rename` that
would perform each pair is there. A pair no single statement performs carries a
`because`, and the excuse is held to being true: declaring one on a pair whose
statement is in the file fails. Nothing in it counts anything, so a rename
added tomorrow is checked tomorrow without the file changing. Its header
records what it cannot see — it proves a statement was written, not that it
took effect, which is `check:identifiers` against a live catalogue.
