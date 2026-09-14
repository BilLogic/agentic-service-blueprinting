import { appFiles, readAppFile } from './app-source.mjs'

/**
 * Where the agent's tools are declared, for the checks that read tool names
 * out of source text rather than importing them (the spec table imports
 * supabase-js and Vite `?raw` markdown, so bare node cannot load it).
 *
 * Two places. The definitions folder holds every tool — one definition
 * each, whose spec derives from its own schema — and the spec table
 * (`specs.ts`) holds their projection. Both are read through
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

/**
 * Each tool's surface, read out of its definition: a `defineWriteTool` is a
 * write by construction, and every other definition states `surface:`
 * itself. The checks that hold the adapter document to the read and write
 * surfaces read this rather than a list — there is no list.
 */
export function toolSurfaces(source) {
  const surfaces = new Map()
  const openers = [...source.matchAll(/\bdefine(Write)?Tool\(\{/g)]
  openers.forEach((opener, index) => {
    const end = index + 1 < openers.length ? openers[index + 1].index : source.length
    const body = source.slice(opener.index, end)
    const name = /\bname: '([a-z_]+)'/.exec(body)
    if (!name) return
    const surface = opener[1] ? 'write' : /\bsurface: '(read|interface|write)'/.exec(body)?.[1]
    if (!surface) throw new Error(`${name[1]} declares no surface`)
    surfaces.set(name[1], surface)
  })
  if (surfaces.size === 0) throw new Error('no tool definitions in the agent tool sources')
  return surfaces
}

/** The names on one surface, in definition order. */
export function toolsOnSurface(source, surface) {
  return [...toolSurfaces(source)].filter(([, s]) => s === surface).map(([name]) => name)
}
