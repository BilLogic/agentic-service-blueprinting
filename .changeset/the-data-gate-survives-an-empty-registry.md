---
'agentic-service-blueprinting': patch
---

The Phase 4b data gate report survives a registry with nothing registered.
`generate_fallbacks.py --register` fills the offline registry for a deployment
that keeps blueprint content offline; one whose content lives entirely in its
database registers nothing, and the report asserted at least one compared pair.
It now says there is nothing to compare and stops, and still asserts that a
registry WITH content yields pairs.
