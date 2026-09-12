/**
 * The app surface the harness runs against, bundled once per run.
 *
 * rolldown bundles app-surface.entry.ts from the application, honouring the
 * `@/` alias, so the tool declarations, the rosters and the offline readers
 * are the exact objects the app hands its providers. The alias is pointed at
 * the root `app-source.mjs` resolves rather than at `<root>/src`, because the
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

import { appSourceRoot } from '../app-source.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

async function loadAppSurface() {
  const { rolldown } = await import('rolldown')
  const bundle = await rolldown({
    input: resolve(ROOT, 'scripts/agent-harness/app-surface.entry.ts'),
    // Honor tsconfig's `@/*` path alias, on whichever root holds the application.
    resolve: { alias: { '@': appSourceRoot(ROOT) } },
    logLevel: 'silent',
  })
  const { output } = await bundle.generate({ format: 'esm' })
  await bundle.close()
  return import(
    `data:text/javascript;base64,${Buffer.from(output[0].code).toString('base64')}`
  )
}

export const surface = await loadAppSurface()
export const { TOOL_SPECS, WRITE_TOOL_NAMES, MOBILE_READ_TOOL_NAMES } = surface
