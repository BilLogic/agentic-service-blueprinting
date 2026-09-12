---
'agentic-service-blueprinting': patch
---

A ledger entry recorded under an older payload shape still reverts, and a suite
says so. `removed_placements` has been captured with and without a `position`
on each row, and with the key written empty as well as omitted; all four reach
the same place. A deployment adopting this code gains the assurance that its
existing ledger — rows written before the capture grew that field — is still
revertable against the template's `restore_cell_touchpoints`, which reads a
placement's name, summary, role and resources and never its position.
