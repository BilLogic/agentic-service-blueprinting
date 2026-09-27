---
'uno-blueprint': patch
---

Shared files speak from both sides

Two comments in files a deployment holds byte-identical still spoke as if
only the template read them: `vite.config.ts` called the template "this
repository", and the router suite said it differed "here" from a copy it is
identical to. Both now say what holds wherever the file runs. Four comment
lines that ran past the wrap in `vite.config.ts` and `scripts/sweep.mjs` are
rewrapped.

Comments only; no behaviour changes. A deployment takes the new bytes of
all three files with the pin bump.
