---
'agentic-service-blueprinting': patch
---

A surface asks `canWrite`, not the editing tier.

The provider still derives the tier and still uses it to compute the write
gate. It no longer publishes that answer. `realCanWrite` stays, named as the
developer portal's honest readout and never as a second gate. ADR 0011 is
the ruling; the glossary defines the four axes and `active service`.
