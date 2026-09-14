/**
 * The app surface the harness runs against, bundled once per run.
 *
 * rolldown bundles app-surface.entry.ts from the application, honouring the
 * `@/` alias, so the tool declarations, the derived rosters and the offline readers
 * are the exact objects the app hands its providers. The alias is pointed at
 * the first layer `sweep.mjs` finds rather than at `<root>/src`, because the
 * two are the same directory only in a tree that keeps its own copy of the
 * application — in a deployment that reads it out of the package, an alias
 * pointed at an absent `src` fails every import in the entry and the harness
 * has no surface at all. Every harness module imports them from
 * here: the runner for the specs and the sample reads, the case file for the
 * write roster its trace checks count against. An ES module evaluates once, so
 * two importers still pay for one bundle.
 */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { appLayers, sweep } from '../sweep.mjs'
/**
 * Vite's `?raw` and asset imports, for the bundler that is not Vite — the
 * published loader, imported BY PACKAGE NAME the way `vite.config.ts` imports
 * the overlay, so this run proves the module a consumer's harness is handed.
 * The app reads its reference documents as text that way, and a tool
 * definition carries its `run` beside its spec, so the spec table reaches the
 * readers and the readers reach the documents; the cell-budget module reads
 * the deployment config, which names the cover's figures. Without the loader
 * the surface bundle fails on the first `.md?raw` it meets.
 */
import { viteImportsPlugin } from 'agentic-service-blueprinting/vite-imports'

/** The tree the harness runs in: the working directory — never this file's location; `sweep.mjs` says why. */
const ROOT = process.cwd()
/** The entry is this module's own neighbour, so it is the one path found from here. */
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), 'app-surface.entry.ts')

async function loadAppSurface() {
  const { rolldown } = await import('rolldown')
  // The sweep refuses a tree with no application at all, which is the failure
  // worth having here: an alias pointed at an absent directory fails every
  // import in the entry, one message at a time, and the harness has no surface.
  sweep({ subject: 'app', root: ROOT, what: 'application source' })
  // THE ALIAS IS THE FIRST LAYER — the deployment's `src` when it keeps one and
  // the package's otherwise — because rolldown takes one directory per alias
  // while the overlay is a rule per path. The entry is the harness's own file
  // and every `@/…` in it resolves inside that one layer, which is the whole
  // answer in this repository (one layer) and in a deployment with no
  // residents (the package's, complete). A deployment that keeps only part of
  // `src` is the case a single alias cannot express, and an import of a file
  // only the package has fails at bundle time rather than quietly.
  const [firstLayer] = appLayers(ROOT)
  const bundle = await rolldown({
    input: ENTRY,
    // Honor tsconfig's `@/*` path alias, on whichever root holds the application.
    resolve: { alias: { '@': firstLayer } },
    plugins: [viteImportsPlugin()],
    logLevel: 'silent',
  })
  const { output } = await bundle.generate({ format: 'esm' })
  await bundle.close()
  return import(
    `data:text/javascript;base64,${Buffer.from(output[0].code).toString('base64')}`
  )
}

export const surface = await loadAppSurface()
export const { TOOL_SPECS, TOOL_DEFINITIONS, WRITE_TOOL_NAMES, MOBILE_READ_TOOL_NAMES, renderCanvasAdapter } =
  surface
