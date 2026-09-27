---
'uno-blueprint': patch
---

The last shared comments fit the wrap

Three comment blocks in `vite.config.ts` and `scripts/sweep.mjs` that ran
past the comment width are rewrapped, and the seed sweep's skip message now
says to check out a deployment beside the template rather than "beside this
repository", which read wrong when the sweep ran inside a deployment.

Comments and one message only; no behaviour changes. Both files are held
byte-identical by a deployment, so it takes the new bytes with the pin bump.
