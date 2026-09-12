#!/usr/bin/env node
/**
 * The canvas adapter's READ surface, against the roster the loop registers.
 *
 * Sibling of scripts/check-write-surface.mjs, and here for the same reason:
 * `references/canvas-adapter.md` is normative for the canvas agent, so a tool
 * name in it is an interface the agent believes it has. The write surface had
 * drifted; so had the read surface, in five places at once, each one a tool
 * name the registry had no entry for. An agent that follows the document
 * calls exactly the names it finds there, whether or not they exist.
 *
 * Two assertions, because the two failures are different shapes:
 *
 *   1. THE ROW. `READ_TOOL_NAMES` in `src/lib/agent/tools/specs.ts` is the
 *      source of truth; the adapter's read-surface row must list exactly it,
 *      in both directions — same comparison the write check makes.
 *
 *   2. THE WHOLE DOCUMENT. Four of those five wrong names were in prose,
 *      not in a row, so a row-scoped check would have walked past them. Every
 *      backticked snake_case token in the file must therefore name a real
 *      tool, or be listed in NOT_TOOLS below. That list is short on purpose:
 *      it fails CLOSED, so a new column name in the prose is a deliberate
 *      one-line admission rather than a hole the next wrong tool slips
 *      through.
 *
 *   node scripts/check-read-surface.mjs
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readAppFile } from './app-source.mjs'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

/**
 * The two sides, and the two places they live.
 *
 * The adapter is a file of THIS tree — a deployment holds it byte-identical
 * beside this script, and that copy is the one its agent reads. The specs are
 * the APPLICATION's, which a deployment does not keep a `src` for: it depends
 * on this repository as a package and reads them out of
 * `node_modules/agentic-service-blueprinting/src`. `readAppFile` is what knows
 * the difference, and it refuses a tree that has the application in neither
 * place rather than comparing the document against an empty roster — which is
 * the shape this check fails in most expensively, because a document that
 * declares tools nobody has and a roster with nobody in it agree perfectly.
 */
const ADAPTER = 'references/canvas-adapter.md'
const SPECS = 'src/lib/agent/tools/specs.ts'

/**
 * Backticked snake_case tokens in the adapter that are NOT tool names.
 *
 * `position` is a column (the canvas dialect's cell slots); `whatif` is a
 * skill; `leads_to` is a `cell_dependencies.kind` value, and it is spelled
 * here rather than left bare because `scripts/check-dependency-kinds.mjs`
 * holds the retired kinds to their code-span form and the live ones should
 * read the same way. Anything else the document spells this way is claimed to
 * be a tool.
 */
const NOT_TOOLS = new Set(['position', 'whatif', 'leads_to'])

/** The tool names in `READ_TOOL_NAMES`. */
export function declaredReadTools(source) {
  const block = /export const READ_TOOL_NAMES = new Set\(\[([\s\S]*?)^\]\)/m.exec(source)
  if (!block) throw new Error(`no READ_TOOL_NAMES set found in ${SPECS}`)
  return [...block[1].matchAll(/'([a-z_]+)'/g)].map(([, name]) => name)
}

/** Every tool name `TOOL_SPECS` registers, read the same textual way. */
export function registeredTools(source) {
  const names = [...source.matchAll(/^\s*name: '([a-z_]+)',$/gm)].map(([, name]) => name)
  if (names.length === 0) throw new Error(`no TOOL_SPECS entries found in ${SPECS}`)
  return names
}

/**
 * The tool names the adapter's read-surface row lists.
 *
 * Same shape as the write row: the list runs to the em dash, and the claim
 * that makes the row normative comes after it.
 */
export function documentedReadTools(markdown) {
  const row = markdown
    .split('\n')
    .find((line) => line.includes('That is the FULL read surface'))
  if (!row) throw new Error(`no read-surface claim found in ${ADAPTER}`)
  const list = row.split('—')[0]
  return [...list.matchAll(/`([a-z_]+)`/g)].map(([, name]) => name)
}

/** Backticked snake_case tokens anywhere in the adapter that name no tool. */
export function phantomTools(markdown, registered) {
  const real = new Set(registered)
  const named = [...markdown.matchAll(/`([a-z][a-z0-9]*(?:_[a-z0-9]+)+)`/g)].map(([, t]) => t)
  return [...new Set(named)].filter((token) => !real.has(token) && !NOT_TOOLS.has(token))
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
  const specs = readAppFile(root, SPECS)
  return {
    ...differences(documentedReadTools(adapter), declaredReadTools(specs)),
    phantom: phantomTools(adapter, registeredTools(specs)),
  }
}

function main() {
  const { undocumented, unknown, duplicated, phantom } = compare()
  const total = undocumented.length + unknown.length + duplicated.length + phantom.length
  if (total === 0) {
    console.log(`${ADAPTER} lists the whole read surface, and every tool it names exists`)
    return
  }
  for (const name of undocumented) {
    console.error(`${name} is a read tool that ${ADAPTER} does not list`)
  }
  for (const name of unknown) {
    console.error(`${ADAPTER} lists ${name}, which is not in READ_TOOL_NAMES`)
  }
  for (const name of duplicated) {
    console.error(`${ADAPTER} lists ${name} more than once`)
  }
  for (const name of phantom) {
    console.error(`${ADAPTER} names \`${name}\`, which is not a tool in TOOL_SPECS`)
  }
  console.error(
    `\nThe agent calls what this document names. Fix ${ADAPTER}, or the sets in` +
      ` ${SPECS}, so the two agree.`,
  )
  process.exit(1)
}

// Same shape as scripts/check-write-surface.mjs: comparing against a
// hand-built `file://` URL silently no-ops whenever the path needs escaping.
const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) main()
