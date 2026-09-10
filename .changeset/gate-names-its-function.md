---
'agentic-service-blueprinting': patch
---

The placement gate's contract names the function, not a migration filename

`placementGateContract.test.ts` pointed twice at `20260830160000`. A migration
filename is an address in one repository's series and means nothing in
another's, so the two copies of this shared file could not be held identical
while it stood there. `sync_cell_touchpoints` is the thing being named, and
naming it is enough.
