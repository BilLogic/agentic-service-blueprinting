/**
 * Reference documents an ADOPTING APP serves that this kit has none of — the
 * leaf half of the reference-docs fork seam.
 *
 * Empty here, and that is the honest statement rather than a stub: this kit
 * describes no particular service, so it has nothing service-specific to add
 * to the rulebook. An app built from it fills this in — its own account of
 * the service it blueprints is the obvious entry — and `referenceNames.ts`
 * splices the list in right after `canvas-adapter`, which leaves that shared
 * vocabulary identical on both sides instead of forking a whole file over one
 * extra name.
 *
 * Why it is a file of its own rather than a row in `referenceDocs.ts`:
 * `referenceNames.ts` has to stay import-free of the documents. It is loaded
 * by `specs.ts`, which the eval harness bundles with rolldown — no Vite, so
 * no `?raw` — and one import from here to there would drag eighteen markdown
 * imports into a bundler that cannot resolve them. Names in a leaf, documents
 * behind Vite; that split is the whole reason for the second file.
 */
export const REFERENCE_NAMES_EXTRA: readonly string[] = []
