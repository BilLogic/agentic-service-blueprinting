---
'uno-blueprint': patch
---

Two shared files cite only what a deployment holds

`vite.config.ts` is held byte-identical by a deployment, but its comments
pointed at five files only this template has — the overlay module by its
path, three test suites, and the base-path module. Read from a deployment,
each was a pointer to nothing. They now name the thing rather than the
path. `scripts/always-loaded.mjs` has one comment line rewrapped to the
comment width.

Comments only; no behaviour changes. A deployment that holds either file
byte-identical takes the new bytes with the pin bump.
