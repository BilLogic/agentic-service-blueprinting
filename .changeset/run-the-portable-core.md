---
"agentic-service-blueprinting": patch
---

`schema.reference.sql` is now checked rather than hand-refreshed: offline
against the generated types, and in CI by replaying every migration against a
stock Postgres behind a small shim. The first run found the snapshot two
migrations stale — `agent_sessions` and `agent_messages` were missing — which
is what an adopter carrying it would have built.
