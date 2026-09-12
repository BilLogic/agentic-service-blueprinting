---
'agentic-service-blueprinting': patch
---

`main` was red: the figure module added with the packaged diagrams names the directory it imports from, and the document-path guard landed in the same release without knowing about it. The module is exempt, for the reason the vendored rulebook is — `docs/` ships with the package, so the path resolves wherever the module is read.
