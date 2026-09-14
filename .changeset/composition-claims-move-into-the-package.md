---
'agentic-service-blueprinting': patch
---

The package claims the files it ships: the composition documents, and the
claims check that reads them, are here now.

`docs/guidelines/composition/` — ten documents, one per assembled surface, each
carrying a `claims:` list — and `scripts/check-harness-claims.mjs`, which holds
those lists against `src/components/{blueprint,editor,cover,mobile}` in both
directions. It runs in this package's own CI as `npm run check:harness`, so a
module added without a document is red here, in the repository that added it.

**For a deployment that already runs a composition-claims check.** The claim for
a file is now written where the file lives, which is the whole of what changes:

- **Delete** every composition document of yours that claims files under
  `src/components/…`, and delete your own copy of the check. Those files are
  this package's, and this package's documents claim all of them; a document you
  keep under a name this package also ships REPLACES ours for that surface,
  claims included, which is the supported way to disagree with our prose.
- **Keep** a composition document for each tree of assembled files you hold
  outside this application, claiming those files. Name those trees in
  `composition.claimed` in your `scripts/repo-config.mjs`, beside
  `composition.documents`, which is where your composition folder is.
- **Hold** `scripts/check-harness-claims.mjs` byte-identical from this package,
  the way you already hold `sweep.mjs`, and point `check:harness` at it. It
  reads your composition folder and this package's underneath it.

A deployment with no assembled files of its own sets `claimed: []`, keeps no
composition folder, and pins a release that adds thirty-one modules without
writing a line. `references/customization.md` § Composition claims is the whole
recipe.
