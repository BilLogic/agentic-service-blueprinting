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

  **Check what links to them before you delete.** These documents are usually
  linked from an index, a codebase guide, a standards document and the root
  README, and those links are relative paths into your own tree — the prose they
  point at now lives inside `node_modules/`, where a relative link cannot reach
  it. Your pointer check and your generated index will go red on the same day.
  Two answers, both fine: keep the documents and accept that yours override ours
  by name, or re-point the links (an index row naming
  `docs/guidelines/composition/overview.md` in this package is the shortest
  landing place) and delete.
- **Keep** a composition document for each tree of assembled files you hold
  outside this application, claiming those files. Name those trees in
  `composition.claimed` in your `scripts/repo-config.mjs`, beside
  `composition.documents`, which is where your composition folder is.
- **Hold** `scripts/check-harness-claims.mjs` byte-identical from this package,
  the way you already hold `sweep.mjs`, and point `check:harness` at it. It
  reads your composition folder and this package's underneath it.

`composition.documents` has to name the folder this package publishes, not a
folder of your choosing: it addresses both your documents and ours, and an
installed package that holds nothing at that name is reported as exactly that
rather than as two hundred unclaimed files.

An upstream module that no document of ours claims is an upstream bug — report
it, do not write the claim. Our own build fails on it before the tag is cut,
which is the whole of why your build no longer has to.

A deployment with no assembled files of its own sets `claimed: []`, keeps no
composition folder, and pins a release that adds thirty-one modules without
writing a line. `references/customization.md` § Composition claims is the whole
recipe.
