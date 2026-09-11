/**
 * The app surface the harness runs against, bundled once per run.
 *
 * rolldown bundles app-surface.entry.ts from src, honouring the `@/` alias, so
 * the tool declarations, the rosters and the offline readers are the exact
 * objects the app hands its providers. Every harness module imports them from
 * here: the runner for the specs and the sample reads, the case file for the
 * write roster its trace checks count against. An ES module evaluates once, so
 * two importers still pay for one bundle.
 */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

async function loadAppSurface() {
  const { rolldown } = await import('rolldown')
  const bundle = await rolldown({
    input: resolve(ROOT, 'scripts/agent-harness/app-surface.entry.ts'),
    // Honor tsconfig's `@/*` → `src/*` path alias.
    resolve: { alias: { '@': resolve(ROOT, 'src') } },
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
