# check: perceived-owner
wave: 2   # needs cell owner/perceived_owner pair; skip if perceived_owner unset everywhere
severity-default: info

## Question
Where does who-the-customer-thinks-is-acting diverge from who actually
acts — and is each divergence designed or accidental?

## Read
Cells where both `owner` and `perceived_owner` are set and differ.
Cluster by (owner → perceived_owner) pair.

## Finding shape
One finding per divergence pair per scenario; cell_keys = the cells in the
cluster. Divergence on the interaction line (customer perceives X, Y acts)
→ warn if no adjacent cell manages the impression; a divergence that a
cell's own content calls out as deliberate (ghost-writing, white-label) →
info, note says "reads as designed".

## Non-findings
Divergences where perceived_owner is simply unset (that's data absence,
not perception design); backstage cells (nobody perceives them).
