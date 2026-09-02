/**
 * The documents this repository holds to its schema.
 *
 * One list, shared by every sweep that reads prose for what the database
 * has. Two lists would drift the way two vocabularies do — a doc added to
 * one and not the other is a doc that half the guards read.
 *
 * WHAT IS SWEPT: the README and CONTEXT.md; `docs/` (the guide, the
 * connectors, engineering, guidelines, the overview); `references/`,
 * `skills/` and `agents/` — the plugin surface an installed agent actually
 * reads.
 *
 * WHAT IS NOT, and why: `docs/adr/` records the decisions of its day in the
 * words of its day, and rewriting a decision record is falsifying it;
 * `docs/plans/` is pre-ticket thinking on the way to a spec; CHANGELOG.md is
 * history by definition; `src/lib/agent/skill/` is a byte-for-byte mirror of
 * `skills/` + `references/`, held identical by `sync-canvas-skills.mjs`, so
 * sweeping it reports every sentence twice.
 */
import { readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

export const ROOT_DOCS = ['README.md', 'CONTEXT.md']
export const SWEPT_DIRS = ['docs', 'references', 'skills', 'agents']
export const HISTORY = ['docs/adr', 'docs/plans']

function markdownUnder(dir) {
  const found = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) found.push(...markdownUnder(path))
    else if (/\.md$/.test(entry)) found.push(path)
  }
  return found
}

/** Repo-relative paths of every swept document, root docs first. */
export function sweptDocs(root = process.cwd()) {
  const base = resolve(root)
  const docs = SWEPT_DIRS.flatMap((dir) => markdownUnder(resolve(base, dir)))
    .map((path) => path.slice(base.length + 1))
    .filter((rel) => !HISTORY.some((dir) => rel.startsWith(`${dir}/`)))
    .sort()
  return [...ROOT_DOCS, ...docs]
}
