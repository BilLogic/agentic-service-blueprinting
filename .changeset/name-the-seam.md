---
"agentic-service-blueprinting": minor
---

The app's backend seam is named: repository interfaces per aggregate
(`src/lib/backend/ports.ts`), an identity port that answers in tiers rather
than claims, and two conformance levels — Transactional and Idempotent — so a
store without transactions can serve the app correctly and visibly. A
framework-free conformance suite ships with it, passed by two reference
implementations. `adapter-contract.md` no longer states our PostgREST coupling
as though it were a property of the world.
