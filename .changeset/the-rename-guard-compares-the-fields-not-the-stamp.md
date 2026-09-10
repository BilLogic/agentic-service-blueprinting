---
'agentic-service-blueprinting': minor
---

The slice rename guard compares the fields a form was seeded from rather than
an `updated_at` stamp. A stamp-based guard can only be wrong in one of two
directions — refusing renames nobody raced, or waving through an overwrite of
someone else's — and which one depends on which stamp it sends.
`updateSliceMetaFromSeed` reads the row back at submit and refuses when the
meta has moved, at whatever stamp it now carries.
