---
'agentic-service-blueprinting': patch
---

Shared files name the decision they cite instead of an address that means
something else in a deployment.

Five comments in the stylesheet cited an ADR by number, and one each in the
illustration upload, the deployment config and the mobile navigation sheet
cited a migration version or an issue number, and the reference loader cited
an ADR by number. A deployment reads these files
byte for byte, and in its own repository each of those addresses names a
different record or nothing. Comment-only; no behaviour changes.
