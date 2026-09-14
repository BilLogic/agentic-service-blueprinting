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
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { sweep } from './sweep.mjs'
import { toolSources } from './tool-sources.mjs'

export const MANIFEST_PATH = 'identifiers.json'

/** `name:` out of a markdown frontmatter block, or null when there is none. */
export function frontmatterName(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source)
  if (!match) return null
  const name = /^name:[ \t]*(.+)$/m.exec(match[1])
  return name ? name[1].trim() : null
}

/**
 * Every file a consumer can name, out of the `references` SUBJECT of
 * `sweep.mjs` — `references/` and every `skills/<skill>/references/`, every
 * file, which is exactly the surface this walked for itself before. Markdown is
 * addressable through `read_reference` by basename-without-extension; JSON
 * schemas are addressed by full filename, because that is how the skills cite
 * them, and the subject holds both for that reason.
 */
function collectReferences(root) {
  const docs = []
  const schemas = []
  for (const path of sweep({ subject: 'references', root, what: 'reference file' }).files) {
    const file = basename(path)
    if (file.endsWith('.md')) docs.push({ name: basename(file, '.md'), path })
    else if (file.endsWith('.json')) schemas.push({ name: file, path })
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

/**
 * The prose these two read is the `docs` SUBJECT of `sweep.mjs` — this
 * repository's markdown, `agents/` and `skills/` among the folders it names —
 * so neither of them lists a directory for itself any more. `where` narrows the
 * subject to the files each is about, and the sweep refuses an empty result:
 * a tree with no `agents/` used to hand back `[]`, and a manifest generated
 * there would have declared that this plugin dispatches no sub-agent.
 *
 * @param {string} root
 * @param {(path: string) => boolean} where
 * @param {string} what
 */
function sweptMarkdown(root, where, what) {
  return sweep({ subject: 'docs', root, where, what })
}

/** The markdown directly under `dir`, named by its frontmatter where it has one. */
function markdownNames(root, dir) {
  const swept = sweptMarkdown(
    root,
    (path) => path.startsWith(`${dir}/`) && !path.slice(dir.length + 1).includes('/'),
    `markdown under ${dir}/`,
  )
  return swept.files.map((path) => {
    const declared = frontmatterName(swept.read(path) ?? '')
    return { name: declared ?? basename(path, '.md'), path }
  })
}

/**
 * The skills, one `SKILL.md` each. The list of skills is DERIVED from the swept
 * markdown rather than read off the directory: a skill is a folder with a body
 * the loader can read, so the bodies are the roster.
 */
function skillNames(root) {
  const swept = sweptMarkdown(
    root,
    (path) => /^skills\/[^/]+\/SKILL\.md$/.test(path),
    'skill body under skills/',
  )
  return swept.files.map((path) => {
    const declared = frontmatterName(swept.read(path) ?? '')
    return { name: declared ?? path.split('/')[1], path }
  })
}

/**
 * Hook names are the event plus the script the event runs.
 *
 * The one list here that names no subject: `hooks/hooks.json` is a single file
 * addressed by path rather than a tree to list, and it is JSON, so no prose
 * sweep covers it. Nothing is walked, so there is nothing for a subject to
 * answer — the events come out of the file's own contents.
 */
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
 *
 * Read through a `sweep` of the application, because these two are the only names in the
 * manifest that come out of the APPLICATION rather than out of the plugin tree,
 * and a deployment keeps no `src` of its own — it depends on this repository as
 * a package and reads them out of `node_modules/agentic-service-blueprinting`.
 * These functions used to answer a missing file with `[]`, which is the worst
 * available answer: the manifest generated there would have declared that the
 * canvas agent offers no tools and accepts no reference names, and `--check`
 * would have called the committed truth stale. A tree with no application has
 * no answer to give, and the sweep says so, naming both roots it looked in.
 */
function agentToolNames(root) {
  // The definitions folder and the spec table together, so a tool is counted
  // wherever a tool source declares one.
  const source = toolSources(root)
  const names = [...source.matchAll(/^\s*name: '([a-z_]+)',$/gm)]
    .map((match) => match[1])
    .sort()
  if (names.length === 0) throw new Error('no tool names in the agent tool sources')
  return names
}

/** Reference names the canvas agent will accept, which is its own list. */
function canvasReferenceNames(root) {
  const app = sweep({ subject: 'app', root, what: 'application source' })
  const source = app.read('src/lib/agent/tools/referenceNames.ts')
  if (source === null) {
    throw new Error(
      `no src/lib/agent/tools/referenceNames.ts under ${app.base}: this generator has no subject`,
    )
  }
  const block = /REFERENCE_NAMES[^=]*=\s*\[([\s\S]*?)\]/.exec(source)
  if (!block) throw new Error('no REFERENCE_NAMES list in src/lib/agent/tools/referenceNames.ts')
  const names = [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1]).sort()
  if (names.length === 0) {
    throw new Error('REFERENCE_NAMES is empty in src/lib/agent/tools/referenceNames.ts')
  }
  return names
}

export function buildManifest(root = process.cwd()) {
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
  const target = join(process.cwd(), MANIFEST_PATH)
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

// Same shape as scripts/sync-cover-assets.mjs: comparing against a
// hand-built `file://` URL silently no-ops whenever the path needs escaping,
// so a checkout under a directory with a space in its name would run this
// script and have it do nothing, successfully.
const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) main()
