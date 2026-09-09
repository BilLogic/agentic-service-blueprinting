---
'agentic-service-blueprinting': patch
---

`linkedText` stops naming the migration that retired the column it replaced

The doc comment read "This is the whole job `evidence.ref` was carrying
(21000208000000)". The parenthetical is an address into this repository's own
migration series, and a deployment's copy of this file carries a different
number for the same change — its series is its own.

That makes the file unenrollable in the byte-identity sense a deployment
promises: a shared file may not cite an identity that means something else on
the other side, which is exactly what a migration filename is. Two copies that
agree on every other byte were kept apart by a number neither reader needs.

The sentence loses nothing. What `evidence.ref` was for, and why a note holding
a locator replaces it, is the whole point of the comment; which migration
performed the retirement is answered by the series itself.
