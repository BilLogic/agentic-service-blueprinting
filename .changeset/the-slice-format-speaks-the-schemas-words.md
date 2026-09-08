---
'agentic-service-blueprinting': minor
---

**Breaking, for slice files.** The slice authoring format's keys are the names
of the columns they write.

| was | is | column |
| --- | --- | --- |
| `type` | `kind` | `slices.kind` |
| `description` | `summary` | `slices.summary` |
| `origin` | `authorship` | `slices.authorship` |
| `order` | `position` | `slices.position` |
| `frames` | `slides` | table `slides` |

`select --type` is `select --kind` with it.

An author had to hold two vocabularies to write one file, and `slice_tools.py`
carried a comment explaining the split rather than fixing it. `frames` was the
worst of the five: `frame` is a real and different thing — `cells.frame` is one
image on one cell — so the format used a live word for the neighbouring
concept, one line above `insert into public.slides`.

There is no alias. A file using a retired key is refused by name and told which
word replaced which, rather than failing on a missing required property.
