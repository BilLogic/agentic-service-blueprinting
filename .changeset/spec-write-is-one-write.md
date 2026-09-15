---
'agentic-service-blueprinting': patch
---

One spec write, six declarations. Cell, lane, phase, scenario, service and step each re-derived the same six-step write rule — normalise, update, translate the failure, require rows, invalidate, record the inverse — comments included, and two of the six had a test. The rule now lives in `src/lib/specWrite.ts` and a level declares what is genuinely its own: its table, the column the write is addressed by, the columns a spec may touch and how each is normalised, what the change makes stale, and the shape of the inverse the ledger carries. Nothing a person editing a spec can see changes, and every level's write is now recorded row by row and ledger entry by ledger entry.
