---
'agentic-service-blueprinting': patch
---

**Every check names a subject, and the five helpers are gone.** The
migrations checks (the reserved band, the portable-core generator, the
archiver roster) read the `migrations` subject; the deployment seed check
reads the `deployment-seed` subject and lets the sweep say the skip. No
script under `scripts/` resolves a root from its own location any more: the
tree a check runs in is the working directory, which is what lets a
deployment run the package's copy of a shared check against its own tree.
`app-source.mjs`, `read-listed.mjs`, `repository-only.mjs` and
`unverified.mjs` are deleted — the skip-said-out-loud rule is the last
section of `sweep.mjs`, the repository-only list is the fence's own, and the
tests that read the application do so through the `app` subject. CONTEXT.md
defines **Subject**.
