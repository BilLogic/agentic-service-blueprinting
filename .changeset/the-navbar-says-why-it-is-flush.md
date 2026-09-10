---
'agentic-service-blueprinting': patch
---

The docked navbar says why it is flush left

`SlideStickyHeader` sits hard against the left edge of the main column with no
margin, and nothing in the file said why. The sidebar is in flow rather than
overlaid, so there is no overlay to surrender a margin to — an absence that
reads as an oversight until someone knows that.

Written down here because the deployment had already written it down there:
this is a shared file whose two copies differed by that comment alone. It goes
upstream so both can carry it.
