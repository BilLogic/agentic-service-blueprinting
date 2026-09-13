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
 * A FOLDER THE REPOSITORY DOES NOT HAVE SWEEPS AS EMPTY, AND SAYS SO. A
 * repository without a plugin surface has no `references/`, `skills/` or
 * `agents/`, and that is a fact about the tree rather than a defect in it; a
 * sweep that threw on it would take down every guard that reads prose.
 *
 * But the same silence covers a name that is simply WRONG. The root documents
 * are prepended unconditionally, so the result of this walk is never empty —
 * which is exactly what hides the collapse: with all four folder names
 * misspelt the corpus goes from fifty-four documents to three, every prose
 * guard passes, and the line they print is the line they printed yesterday.
 * So each configured folder the tree does not have is announced as a subject
 * that went unswept, once per run. An absent plugin surface reads as the fact
 * it is; a typo reads as a folder nobody has.
 *
 * WHAT IS NOT, and why: the trees `repoConfig.datedRecords` names — the
 * decision records — keep the words of the day they were written, and
 * rewriting a decision record is falsifying it. Which trees those are is each
 * repository's own, for the same reason `sweptDirs` is;
 * CHANGELOG.md is history by definition; `src/lib/agent/skill/`, where it
 * exists, is a byte-for-byte mirror of `skills/` + `references/`, held
 * identical by `sync-canvas-skills.mjs`, so sweeping it reports every sentence
 * twice.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { repoConfig } from './repo-config.mjs'
import { unverified } from './unverified.mjs'

export const ROOT_DOCS = ['README.md', 'CONTEXT.md', 'AGENTS.md']
export const SWEPT_DIRS = repoConfig.sweptDirs
/** Trees that keep the words of the day they were written, so nothing sweeps them. */
export const DATED_RECORDS = repoConfig.datedRecords

function markdownUnder(dir) {
  const found = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) found.push(...markdownUnder(path))
    else if (/\.md$/.test(entry)) found.push(path)
  }
  return found
}

/**
 * The configured folders this tree does not have, repo-relative.
 *
 * Separated from the walk so a caller can ask the question without taking the
 * walk, and so the announcement below has one subject to name.
 */
export function unsweptDirs(root = process.cwd(), dirs = SWEPT_DIRS) {
  const base = resolve(root)
  return dirs.filter((dir) => !existsSync(resolve(base, dir)))
}

/**
 * Repo-relative paths of every swept document, root docs first.
 *
 * `io` is the pair of sinks `unverified` writes to, handed on so a test can
 * read the announcement rather than describe it.
 */
export function sweptDocs(root = process.cwd(), dirs = SWEPT_DIRS, io) {
  const base = resolve(root)
  const missing = unsweptDirs(base, dirs)
  if (missing.length > 0) {
    unverified(
      `the prose under ${missing.join(', ')}`,
      `${missing.length === 1 ? 'that folder is' : 'those folders are'} named as swept and ` +
        `this tree does not have ${missing.length === 1 ? 'it' : 'them'}, so every prose guard ` +
        `ran over the ${dirs.length - missing.length} folder(s) that are here and the root ` +
        `documents. Correct the name, or remove it from the swept list.`,
      io,
    )
  }
  const docs = dirs
    .map((dir) => resolve(base, dir))
    .filter((dir) => existsSync(dir))
    .flatMap((dir) => markdownUnder(dir))
    .map((path) => path.slice(base.length + 1))
    .filter((rel) => !DATED_RECORDS.some((dir) => rel.startsWith(`${dir}/`)))
    .sort()
  return [...ROOT_DOCS, ...docs]
}
