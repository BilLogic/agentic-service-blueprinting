#!/usr/bin/env node
/**
 * The plugin contract's IDENTIFIER LAYER, written down so a rename is a diff.
 *
 * Everything listed here is resolved BY NAME at runtime by something outside
 * this repo: a consumer types `/sb:audit`, the audit skill dispatches an agent
 * called `auditor`, the canvas agent calls `read_reference { name: 'data-model' }`,
 * a hook fires by event. None of it type-checks. Renaming any of it breaks a
 * consumer at runtime with no compile error and no test failure — which is
 * exactly how a rename shipped once already (`layer-roles` -> `lane-roles`
 * left fourteen stale pointers, one of them an unbuildable `?raw` import).
 *
 * So the names are generated from the tree, committed, and diffed in test.
 * A rename then shows up in review as a line in `identifiers.json`, and the
 * reviewer gets to ask the only question that matters: who else says this word?
 *
 *   node scripts/generate-identifier-manifest.mjs           # write it
 *   node scripts/generate-identifier-manifest.mjs --check   # fail on drift
 *
 * Bare-name collisions are a hard error, not a diff: `read_reference` resolves
 * by bare filename across every references/ directory, so two files that share
 * one basename make the resolution order the contract.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, basename, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))
export const MANIFEST_PATH = 'identifiers.json'

/** `name:` out of a markdown frontmatter block, or null when there is none. */
export function frontmatterName(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source)
  if (!match) return null
  const name = /^name:[ \t]*(.+)$/m.exec(match[1])
  return name ? name[1].trim() : null
}

/** Directories named `references` anywhere in the plugin tree, depth-first. */
function referenceDirs(root) {
  const found = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const full = join(dir, entry.name)
      if (entry.name === 'references') found.push(full)
      else walk(full)
    }
  }
  if (existsSync(join(root, 'references'))) found.push(join(root, 'references'))
  if (existsSync(join(root, 'skills'))) walk(join(root, 'skills'))
  return found
}

/**
 * Every file a consumer can name. Markdown is addressable through
 * `read_reference` by basename-without-extension; JSON schemas are addressed
 * by full filename, because that is how the skills cite them.
 */
function collectReferences(root) {
  const docs = []
  const schemas = []
  for (const dir of referenceDirs(root)) {
    for (const file of readdirSync(dir).sort()) {
      const path = relative(root, join(dir, file)).replaceAll('\\', '/')
      if (file.endsWith('.md')) docs.push({ name: basename(file, '.md'), path })
      else if (file.endsWith('.json')) schemas.push({ name: file, path })
    }
  }
  return { docs, schemas }
}

/** Names claimed twice. Returns [] when every name resolves to one file. */
export function collisions(entries) {
  const seen = new Map()
  for (const entry of entries) {
    const paths = seen.get(entry.name) ?? []
    paths.push(entry.path)
    seen.set(entry.name, paths)
  }
  return [...seen]
    .filter(([, paths]) => paths.length > 1)
    .map(([name, paths]) => ({ name, paths }))
}

function markdownNames(root, dir) {
  const full = join(root, dir)
  if (!existsSync(full)) return []
  return readdirSync(full)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => {
      const declared = frontmatterName(readFileSync(join(full, file), 'utf8'))
      return { name: declared ?? basename(file, '.md'), path: `${dir}/${file}` }
    })
}

function skillNames(root) {
  const full = join(root, 'skills')
  if (!existsSync(full)) return []
  return readdirSync(full, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((dir) => {
      const skill = join(full, dir, 'SKILL.md')
      const declared = existsSync(skill)
        ? frontmatterName(readFileSync(skill, 'utf8'))
        : null
      return { name: declared ?? dir, path: `skills/${dir}/SKILL.md` }
    })
}

/** Hook names are the event plus the script the event runs. */
function hookNames(root) {
  const file = join(root, 'hooks/hooks.json')
  if (!existsSync(file)) return []
  const { hooks = {} } = JSON.parse(readFileSync(file, 'utf8'))
  const out = []
  for (const event of Object.keys(hooks).sort()) {
    for (const group of hooks[event]) {
      for (const hook of group.hooks ?? []) {
        const script = /hooks\/([\w.-]+)/.exec(hook.command ?? '')
        out.push({ event, script: script ? script[1] : null })
      }
    }
  }
  return out
}

/**
 * Tool names as the model sees them, read out of the spec source rather than
 * imported: `specs.ts` is TypeScript and this script runs under bare node.
 */
function agentToolNames(root) {
  const file = join(root, 'src/lib/agent/tools/specs.ts')
  if (!existsSync(file)) return []
  const source = readFileSync(file, 'utf8')
  return [...source.matchAll(/^\s*name: '([a-z_]+)',$/gm)]
    .map((match) => match[1])
    .sort()
}

/** Reference names the canvas agent will accept, which is its own list. */
function canvasReferenceNames(root) {
  const file = join(root, 'src/lib/agent/tools/referenceNames.ts')
  if (!existsSync(file)) return []
  const source = readFileSync(file, 'utf8')
  const block = /REFERENCE_NAMES[^=]*=\s*\[([\s\S]*?)\]/.exec(source)
  if (!block) return []
  return [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1]).sort()
}

export function buildManifest(root = REPO_ROOT) {
  const { docs, schemas } = collectReferences(root)
  const clashes = collisions(docs).concat(collisions(schemas))
  if (clashes.length > 0) {
    const detail = clashes
      .map(({ name, paths }) => `  ${name}: ${paths.join(', ')}`)
      .join('\n')
    throw new Error(
      `Reference names must be unique across every references/ directory — ` +
        `read_reference resolves by bare name:\n${detail}`,
    )
  }
  const plugin = JSON.parse(
    readFileSync(join(root, '.claude-plugin/plugin.json'), 'utf8'),
  )
  return {
    note: 'Generated by scripts/generate-identifier-manifest.mjs. Every name here is resolved at runtime by a consumer. Renaming one is a breaking change to the plugin contract.',
    plugin: plugin.name,
    skills: skillNames(root),
    references: docs,
    schemas,
    agents: markdownNames(root, 'agents'),
    hooks: hookNames(root),
    agentTools: agentToolNames(root),
    canvasReferenceNames: canvasReferenceNames(root),
  }
}

function main() {
  const check = process.argv.includes('--check')
  const target = join(REPO_ROOT, MANIFEST_PATH)
  const next = `${JSON.stringify(buildManifest(), null, 2)}\n`
  if (!check) {
    writeFileSync(target, next)
    console.log(`wrote ${MANIFEST_PATH}`)
    return
  }
  const current = existsSync(target) ? readFileSync(target, 'utf8') : ''
  if (current === next) {
    console.log(`${MANIFEST_PATH} is current`)
    return
  }
  console.error(
    `${MANIFEST_PATH} is stale. An identifier changed — decide whether that ` +
      `is a breaking change for consumers, then run:\n\n` +
      `  node scripts/generate-identifier-manifest.mjs\n`,
  )
  process.exit(1)
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main()
