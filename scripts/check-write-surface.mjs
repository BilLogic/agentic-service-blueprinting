#!/usr/bin/env node
/**
 * The canvas adapter's write surface, against the set the loop enforces.
 *
 * `references/canvas-adapter.md` names the write tools and then says "That is
 * the FULL write surface; nothing else writes". The agent reads that sentence
 * as permission: a tool missing from the list is a tool it believes it cannot
 * call. The list drifted — it named tools that do not exist and omitted ones
 * that do — and nothing noticed, because a list of identifiers wearing prose
 * reads like prose.
 *
 * The write surface is every `defineWriteTool` under
 * `src/lib/agent/tools/definitions/`: the loop gates batch etiquette and the
 * viewer refusal on that surface. This compares the two in both directions
 * and names every tool they disagree about.
 *
 *   node scripts/check-write-surface.mjs
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { toolSources, toolsOnSurface } from './tool-sources.mjs'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

/**
 * The two sides, and the two places they live — same split as the read check.
 *
 * The adapter is a file of THIS tree, held byte-identical by every deployment.
 * The definitions are the APPLICATION's, and a deployment keeps no `src` of
 * its own: it reads them out of `node_modules/agentic-service-blueprinting/src`.
 * `toolSources` refuses a tree that has the application in neither place,
 * because "the document lists nothing the roster lacks" is satisfied by a
 * roster that could not be read at all.
 */
const ADAPTER = 'references/canvas-adapter.md'

/**
 * The tools on the write surface, from their definitions.
 *
 * Read textually rather than imported: the definitions are TypeScript behind
 * a path alias, and every consumer that wants the real value already pays for
 * a bundle (scripts/agent-harness/run.mjs). A check that needs a build step
 * is a check that gets skipped.
 */
export function declaredWriteTools(source) {
  return toolsOnSurface(source, 'write')
}

/**
 * The tool names the adapter's write-surface row lists.
 *
 * The row ends its list at an em dash — after it come `ui_command`'s
 * data-changing commands, which are a write path but not a write TOOL (the
 * loop spells that case out separately), so the dash is where the comparable
 * list stops.
 */
export function documentedWriteTools(markdown) {
  const row = markdown
    .split('\n')
    .find((line) => line.includes('That is the FULL write surface'))
  if (!row) throw new Error(`no write-surface claim found in ${ADAPTER}`)
  const list = row.split('—')[0]
  return [...list.matchAll(/`([a-z_]+)`/g)].map(([, name]) => name)
}

/** Names on one side and not the other, plus any the doc lists twice. */
export function differences(documented, declared) {
  const listed = new Set(documented)
  const real = new Set(declared)
  return {
    undocumented: declared.filter((name) => !listed.has(name)),
    unknown: documented.filter((name) => !real.has(name)),
    duplicated: [...new Set(documented.filter((name, i) => documented.indexOf(name) !== i))],
  }
}

export function compare(root = REPO_ROOT) {
  const adapter = readFileSync(join(root, ADAPTER), 'utf8')
  return differences(documentedWriteTools(adapter), declaredWriteTools(toolSources(root)))
}

function main() {
  const { undocumented, unknown, duplicated } = compare()
  if (undocumented.length + unknown.length + duplicated.length === 0) {
    console.log(`${ADAPTER} lists the whole write surface and nothing else`)
    return
  }
  for (const name of undocumented) {
    console.error(`${name} is a write tool that ${ADAPTER} does not list`)
  }
  for (const name of unknown) {
    console.error(`${ADAPTER} lists ${name}, which is not a write tool`)
  }
  for (const name of duplicated) {
    console.error(`${ADAPTER} lists ${name} more than once`)
  }
  console.error(
    `\nThe agent treats that list as permission. Fix the row in ${ADAPTER}, or` +
      ' the tool definitions, so the two agree.',
  )
  process.exit(1)
}

// Same shape as scripts/check-version-agreement.mjs: comparing against a
// hand-built `file://` URL silently no-ops whenever the path needs escaping.
const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) main()
