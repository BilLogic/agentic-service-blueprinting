import { appFiles, readAppFile } from './app-source.mjs'

/**
 * Where the agent's tools are declared, for the checks that read tool names
 * out of source text rather than importing them (the spec table imports
 * supabase-js and Vite `?raw` markdown, so bare node cannot load it).
 *
 * Two places. The definitions folder holds every tool — one definition
 * each, whose spec derives from its own schema — and the spec table
 * (`specs.ts`) holds the rosters and the projection. Both are read through
 * this one function so a check that counts tools never learns which file a
 * name is in.
 *
 * Test files under the folder are not declarations and are skipped.
 */

export const TOOL_SPEC_TABLE = 'src/lib/agent/tools/specs.ts'
export const TOOL_DEFINITIONS_DIR = 'src/lib/agent/tools/definitions/'

/** Every source file that declares tools, `src/…` relative. */
export function toolSourcePaths(repoRoot) {
  const definitions = appFiles(
    repoRoot,
    (path) =>
      path.startsWith(TOOL_DEFINITIONS_DIR) &&
      path.endsWith('.ts') &&
      !path.endsWith('.test.ts'),
    'tool definition',
  )
  return [TOOL_SPEC_TABLE, ...definitions]
}

/** The declaring sources concatenated, in a stable order. */
export function toolSources(repoRoot) {
  return toolSourcePaths(repoRoot)
    .map((path) => readAppFile(repoRoot, path))
    .join('\n')
}
