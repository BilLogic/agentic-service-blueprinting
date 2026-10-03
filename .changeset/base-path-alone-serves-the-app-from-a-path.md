---
'uno-blueprint': patch
---

`BASE_PATH` alone serves the app from a path. A build under a prefix now writes the prefixed hosting rules into `dist/_redirects` — the site root sent on to the prefix with a 301, the `/<prefix>/assets/*` 404, then the `/<prefix>/*` fallback, none forced — and moves the year-long hashed cache in `dist/_headers` to `/<prefix>/assets/*`, so a host given only `BASE_PATH` serves deep links, 404s a missing chunk and caches the hashed output. `netlify.toml` stays written for the root. A `public/_redirects` of a repository's own is kept above the generated rules, and a rule in it that answers `/` or covers the prefix refuses the build in one line. `npm run check:hosting -- --built` reads the built pair back, and the committed check holds a root-written table to the root's rules. A root build is unchanged. A deployment that wrote the prefixed rules into `netlify.toml` by hand keeps working; the build writes the same rules ahead of them.
