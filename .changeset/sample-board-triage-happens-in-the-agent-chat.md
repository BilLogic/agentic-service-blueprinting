---
'uno-blueprint': patch
---

The sample board no longer claims a findings panel

The audit scenario's surface cells described a findings panel with severity
badges and triage buttons, and one step was named "Triage on the canvas". The
app has none of these: findings are rows the agent lists and triages in the
chat, with `open`, `resolved` and `dismissed` as the only statuses. The cells
now say that, the step is "Triage the findings", and the owner's triage cell no
longer offers an "accept" status that doesn't exist.
