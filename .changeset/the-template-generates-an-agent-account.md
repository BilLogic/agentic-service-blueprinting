---
'agentic-service-blueprinting': patch
---

Let a deployment generate an agent account from a connected database.

The schema account an agent reads was built beside one install and imported
by path, so that loader could never match this template's. The generator and its
check live here now; each deployment's generated document is its own
content, registered through the existing extra-reference seams. With no
database configured nothing is generated or registered, and the agent's
reference list stays this template's own.
