---
'agentic-service-blueprinting': minor
---

The service panel no longer sends the `business_models` read for a reader the
database will refuse. `SupabaseProvider` publishes `canReadPrivate`, and
`useServiceSpec` gates the restricted request on it — so a signed-out visitor
pays no refused round-trip per load, and a 42501 that does arrive is a signal
again rather than the ordinary case the hook had to swallow.
