/**
 * The documents this repository holds to its schema.
 *
 * One list, shared by every sweep that reads prose for what the database
 * has. Two lists would drift the way two vocabularies do — a doc added to
 * one and not the other is a doc that half the guards read.
 *
 * WHAT IS SWEPT: the README, CONTEXT.md and AGENTS.md — the router is the
 * one file every session is handed without choosing, so a retired word there
 * is loaded on every boot, and it was the one file no sweep read; then the
 * markdown under every folder `sweptDirs` names in `scripts/repo-config.mjs`.
 * That list is each repository's own: the docs tree everywhere, and, where the
 * repository ships a plugin, the surface an installed agent actually reads.
 *
 * A FOLDER THE REPOSITORY DOES NOT HAVE SWEEPS AS EMPTY. A repository without a
 * plugin surface has no `references/`, `skills/` or `agents/`, and that is a
 * fact about the tree rather than a defect in it; a sweep that threw on it
 * would take down every guard that reads prose.
 *
 * WHAT IS NOT, and why: `docs/adr/` records the decisions of its day in the
 * words of its day, and rewriting a decision record is falsifying it;
 * CHANGELOG.md is history by definition; `src/lib/agent/skill/`, where it
 * exists, is a byte-for-byte mirror of `skills/` + `references/`, held
 * identical by `sync-canvas-skills.mjs`, so sweeping it reports every sentence
 * twice.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { repoConfig } from './repo-config.mjs'

export const ROOT_DOCS = ['README.md', 'CONTEXT.md', 'AGENTS.md']
export const SWEPT_DIRS = repoConfig.sweptDirs
/** Trees that keep the words of the day they were written, so nothing sweeps them. */
export const DATED_RECORDS = ['docs/adr']

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
export function sweptDocs(root = process.cwd(), dirs = SWEPT_DIRS) {
  const base = resolve(root)
  const docs = dirs
    .map((dir) => resolve(base, dir))
    .filter((dir) => existsSync(dir))
    .flatMap((dir) => markdownUnder(dir))
    .map((path) => path.slice(base.length + 1))
    .filter((rel) => !DATED_RECORDS.some((dir) => rel.startsWith(`${dir}/`)))
    .sort()
  return [...ROOT_DOCS, ...docs]
}
