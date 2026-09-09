---
'agentic-service-blueprinting': patch
---

The write surface is held to the writers, not to a list

`PANEL_WRITE_SURFACE` declares the tables and columns the authoring UI writes
directly, and `check:seed-load` asks a real database whether a signed-in author
may reach each of them. Nothing enforced the declaration, so it drifted — not
by one line but by six tables. `cells`, `cell_touchpoints`, `evidence`,
`audit_findings`, `slices` and `slides` were all written by the app and named
nowhere on it, which made the check's own report — "every column the panels
write is reachable" — true of eight tables and false of the app.

All six are now listed, with the columns their `.update({…})` names. More to
the point, a new test walks `src/` for direct table writes and holds the
surface to what it finds, in both directions: a table the app writes and the
surface does not name fails, and so does an entry nothing writes any more.
Where a table is deliberately outside the surface it says so and why —
`agent_sessions` and `agent_messages` are the agent transcript, best-effort by
design, and asserting a grant on them would assert the opposite of the intent.

The columns cannot be scanned for — a payload is as often `.update(patch)` as a
literal — so they are held instead to `src/types/database.ts`: every name on
the surface must be a name the schema has. That also removes a bad failure
mode, because `has_column_privilege` raises on a column that does not exist, so
a typo used to reach CI as "the fresh-database seed load failed" without ever
naming the column.

The scan is shared with the write-boundary contract rather than written twice.
That rule asks who may write and this one asks what they write, and two parsers
of one subject would be two readers to drift from each other — which is the
failure both rules exist to catch.
