---
'agentic-service-blueprinting': patch
---

Un-citing a cell drops it from the slide's image set.

A `cell_ids` change deletes `slide_images` rows whose cell is no longer cited. Remaining members keep their positions, and an emptied set stays authored rather than flipping back to untouched.
