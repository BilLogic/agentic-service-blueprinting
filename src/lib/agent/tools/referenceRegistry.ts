/**
 * Reference documents a DEPLOYMENT contributes — the mountable half of the
 * reference-doc seam, and a LEAF module: it imports nothing at all.
 *
 * `referenceDocs.ts` owns the documents this kit ships and names their paths,
 * which is a fork seam for an app that COPIES the repo — a vendored tree and
 * an installed package can never spell the same specifier. A deployment that
 * MOUNTS the package has neither problem and cannot use that seam: it does not
 * respell the kit's paths (the kit's own copies ship inside the package it
 * imported), and it cannot edit the module either way. What it actually needs
 * is narrower and additive — serve a document of its own, and occasionally
 * serve its own copy of one of the kit's. Both are operations on a record, so
 * both are a call rather than an edit:
 *
 *     registerReferenceDocs({ blueprint: blueprintAccount })
 *
 * The host holds the `?raw` imports; this module only ever sees strings.
 *
 * ── WHY IT IMPORTS NOTHING ────────────────────────────────────────────────
 *
 * `referenceNames.ts` reads this module, and `specs.ts` reads that one, and
 * the eval harness bundles `specs.ts` with rolldown — no Vite, so no `?raw`
 * loader on that path. A registry that imported a document, or anything that
 * transitively imports one, would drag markdown imports into a bundler that
 * cannot resolve them. Names and a plain string map here; `?raw` specifiers
 * strictly behind Vite, in `referenceDocs.ts` and in the host's own module.
 *
 * ── WHEN IT HAS TO BE CALLED ──────────────────────────────────────────────
 *
 * BEFORE the host imports the app, from a module imported before it. Both
 * consumers read this registry while they evaluate — `REFERENCE_DOCS` builds
 * the served record, `REFERENCE_NAMES` builds the vocabulary, and `specs.ts`
 * interpolates that vocabulary into the `get_reference` tool description a
 * model reads. Registering later would leave the agent serving a document it
 * was never told exists. So the registry freezes the first time it is read,
 * and a later call throws rather than half-applying. Same ordering rule, and
 * the same reason, as `lib/storageNamespace.ts`.
 */

/** What a deployment has registered. Empty in the standalone template. */
let registered: Record<string, string> = {}

/** Has a consumer built its record or its vocabulary from this yet? */
let observed = false

/**
 * Serve these documents alongside the kit's own.
 *
 * A key the kit already serves REPLACES that document and adds no name; a key
 * it does not becomes an additional reference, spliced into the vocabulary
 * right after the canvas adapter. Repeat calls accumulate, so a host may
 * register from more than one module as long as all of them run before the
 * app is imported.
 */
export function registerReferenceDocs(docs: Record<string, string>): void {
  if (observed)
    throw new Error(
      'Reference documents are already being served and cannot be added to. ' +
        'Call registerReferenceDocs from a module imported BEFORE the one ' +
        "that imports the app — the agent's tool description quotes the " +
        'reference vocabulary while it evaluates.',
    )
  registered = { ...registered, ...docs }
}

/** The registered documents, and the point at which the registry freezes. */
export function registeredReferenceDocs(): Record<string, string> {
  observed = true
  return { ...registered }
}

/** The registered names, in registration order. Freezes the registry too. */
export function registeredReferenceNames(): readonly string[] {
  observed = true
  return Object.keys(registered)
}
