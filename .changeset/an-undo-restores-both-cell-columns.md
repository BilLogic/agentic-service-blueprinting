---
'agentic-service-blueprinting': patch
---

An undo of a finding update restores both cell columns. `cellIds` wrote
`cell_ids` and `cell_keys` together but the captured inverse named only
`cellIds`, so reverting rebuilt `cell_keys` from the ids — discarding the IR
key paths an imported finding carries. The two are named separately now, and
`findingMutations.test.ts` holds the inverse to what the write moved.
