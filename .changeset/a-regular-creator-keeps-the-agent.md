---
'agentic-service-blueprinting': patch
---

A regular creator keeps the agent, and the gate says why.

Nothing renders differently. A signed-in regular creator and a signed-in admin
already saw the same ⚙ settings popover — the same Provider, Model and API-key
rows — because the agent block is gated on `canAgent`, which asks whether there
is a session and never asks the tier. What changes is that this stops being
true by accident.

**The decision.** The agent is a reading tool. Someone who cannot edit a
blueprint still needs to ask questions of it, and the key is theirs — pasted
into their own browser, spending their own quota. Tier gates writing, not
asking. `canAgent`'s own doc in `SupabaseProvider` now says that, and the
composer that reads it says which flag it is reading and which one it is not.
The reasoning sits at the seam because every other gate in that file narrows as
the tier narrows, so this one reads as an oversight to anyone who arrives at it
cold.

**Both halves are pinned together.** `agentTierLine.test.tsx` renders the real
provider over a fake client and asserts, for one signed-in regular session,
that the three agent rows are on screen AND that `canAgentWrite` is false — the
agent it talks to holds read tools only. A second case shows an admin getting
the same three rows, so the write tools are the whole difference between the
tiers. Reading either assertion alone makes the other look like the bug, which
is why they are one test. Tier-gating the settings surface fails it with the
ruling in the message rather than a restated boolean.
