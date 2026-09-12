import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

import { ISSUE_NUMBER, proseLines } from './citations'

/*
 * NO FILE UNDER `src/` CITES AN ISSUE NUMBER.
 *
 * The whole tree, not the subset a deployment has enrolled. `citations.ts`
 * carries the reasoning; the short version is that enrollment is a fact
 * about somebody else's repository, adoption moves files into it one release
 * at a time, and the narrower rule is discovered by a downstream gate going
 * red rather than by a check here.
 *
 * Scripts, documentation, ADRs and changesets are out of scope. They are
 * this repository talking to itself, and a number there resolves where it
 * was written.
 */

const SRC = join(process.cwd(), 'src')

/**
 * The vendored rulebook under `src/lib/agent/skill/` is copied byte for byte
 * from `references/` and `skills/` by `scripts/sync-canvas-skills.mjs`, so a
 * citation there is a citation in the source and editing the copy is undone
 * by the next sync. In scope all the same — it ships under `src/` — and the
 * failure says where the edit goes.
 */
const GENERATED = 'lib/agent/skill/'

/**
 * The two files that define what a citation looks like have to be able to
 * write one down. Nothing else is exempt.
 */
const GUARDS = new Set(['citations.ts', 'citations.test.ts'])

const READABLE = /\.(?:ts|tsx|js|jsx|mjs|cjs|css|md|json|snap|html|svg)$/

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return filesUnder(path)
    return READABLE.test(entry.name) ? [path] : []
  })
}

describe('a shared file names the decision, never the number', () => {
  it('cites no issue number anywhere under src/', () => {
    const offenders = filesUnder(SRC).flatMap((path) => {
      const name = relative(SRC, path)
      if (GUARDS.has(name)) return []
      const where = name.startsWith(GENERATED)
        ? `src/${name} (generated — fix the source under references/ or skills/, then \`npm run sync:canvas-skills\`)`
        : `src/${name}`
      return proseLines(readFileSync(path, 'utf8'), name).flatMap(({ line, text }) =>
        ISSUE_NUMBER.test(text) ? [`${where}:${line}: ${text.trim()}`] : [],
      )
    })
    expect(
      offenders,
      `An issue number is this repository's queue, and a deployment reading it lands in its own. Name the decision instead:\n${offenders.join('\n')}`,
    ).toEqual([])
  })

  it('reads a citation when there is one, so the guard is not vacuous', () => {
    // The spellings that reached a release before the rule was held here.
    expect(ISSUE_NUMBER.test(' * the panel judgement recorded in #412')).toBe(true)
    expect(ISSUE_NUMBER.test('// the fallback #622 retired')).toBe(true)
    expect(ISSUE_NUMBER.test('a sweep found the same shape (#621).')).toBe(true)
    // And not on the things that merely look like one.
    expect(ISSUE_NUMBER.test('className="bg-[#fff]"')).toBe(false)
    expect(ISSUE_NUMBER.test('const id = `#${slug}`')).toBe(false)
    expect(ISSUE_NUMBER.test('background: #10B981')).toBe(false)
  })

  it('reads prose, and leaves what the compiler reads alone', () => {
    // A colour in a declaration and a label the product shows are not
    // addressed to a reader with a tracker open.
    expect(proseLines('  mask: linear-gradient(#000 0 0);\n', 'a.css')).toEqual([])
    expect(proseLines("const t = 'interview #4'\n", 'a.ts')).toEqual([])
    // A comment is, wherever it sits.
    expect(proseLines('const a = 1 // see #12\n', 'a.ts')).toEqual([
      { line: 1, text: '// see #12' },
    ])
    expect(proseLines('/*\n * see #12\n */\n', 'a.ts')).toEqual([
      { line: 1, text: '/*' },
      { line: 2, text: ' * see #12' },
      { line: 3, text: ' */' },
    ])
    // Markdown is prose end to end.
    expect(proseLines('see #12\n', 'a.md')).toEqual([
      { line: 1, text: 'see #12' },
      { line: 2, text: '' },
    ])
  })
})
