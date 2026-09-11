---
'agentic-service-blueprinting': patch
---

`npm run agent-account -- --record` no longer fails on the run that records.

The ratchet was judged against the baseline the run was replacing, so the
first record reported the baseline missing and a re-record after a coverage
gain reported it stale — both failures naming the very command that raised
them, and both exiting 1. A recording run now writes the baseline and skips
those two failures; the account's own drift check still applies.
