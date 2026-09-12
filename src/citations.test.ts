import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

import { ISSUE_NUMBER, RECORD_NUMBER, proseLines } from './citations'

/*
 * NO FILE UNDER `src/` CITES A NUMBER.
 *
 * The whole tree, not the subset a deployment has enrolled. `citations.ts`
 * carries the reasoning; the short version is that enrollment is a fact
 * about somebody else's repository, adoption moves files into it one release
 * at a time, and the narrower rule is discovered by a downstream gate going
 * red rather than by a check here.
 *
 * Two kinds of number, one failure. `#412` resolves against the reader's
 * issue queue; `ADR 0012` resolves against the reader's `docs/adr/`. A
 * deployment has neither of this repository's, so the reader lands on
 * somebody else's decision or on nothing, and believes they have the reason.
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
 * The files that define what a citation looks like have to be able to write
 * one down. `vendoredDivergence.test.ts` joined them when record numbers came
 * into scope here: it is the guard that states the vendoring half of the rule,
 * and it states it by quoting the citation it refuses. Nothing else is exempt.
 *
 * The exemption carries more weight now that `proseLines` reads test names
 * and failure messages, because a guard whose SUBJECT is a citation writes
 * most of its examples there — `expect(RECORD_NUMBER.test('… ADR 0012 …'))`
 * is the assertion, not a pointer, and a test named for the thing it refuses
 * is the clearest name it can have. These three earn the exemption by being
 * the definition; everything else states the decision in words.
 */
const GUARDS = new Set([
  'citations.ts',
  'citations.test.ts',
  join('components', 'vendoredDivergence.test.ts'),
])

const READABLE = /\.(?:ts|tsx|js|jsx|mjs|cjs|css|md|json|snap|html|svg)$/

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return filesUnder(path)
    return READABLE.test(entry.name) ? [path] : []
  })
}

/**
 * Every prose line under `src/` that matches `citation`, addressed.
 *
 * @param citation - one of the matchers from `citations.ts`
 * @returns {string[]} `path:line: text`, empty when the rule holds
 */
function offenders(citation: RegExp): string[] {
  return filesUnder(SRC).flatMap((path) => {
    const name = relative(SRC, path)
    if (GUARDS.has(name)) return []
    const where = name.startsWith(GENERATED)
      ? `src/${name} (generated — fix the source under references/ or skills/, then \`npm run sync:canvas-skills\`)`
      : `src/${name}`
    return proseLines(readFileSync(path, 'utf8'), name).flatMap(({ line, text }) =>
      citation.test(text) ? [`${where}:${line}: ${text.trim()}`] : [],
    )
  })
}

describe('a shared file names the decision, never the number', () => {
  it('cites no issue number anywhere under src/', () => {
    const found = offenders(ISSUE_NUMBER)
    expect(
      found,
      `An issue number is this repository's queue, and a deployment reading it lands in its own. Name the decision instead:\n${found.join('\n')}`,
    ).toEqual([])
  })

  it('cites no record number anywhere under src/', () => {
    const found = offenders(RECORD_NUMBER)
    expect(
      found,
      `An ADR number resolves in this repository's docs/adr/, which a deployment enrolling the file does not have. Carry the decision into the sentence instead:\n${found.join('\n')}`,
    ).toEqual([])
  })

  it('reads a citation when there is one, so the guard is not vacuous', () => {
    // The spellings that reached a release before the rule was held here.
    expect(ISSUE_NUMBER.test(' * the panel judgement recorded in #412')).toBe(true)
    expect(ISSUE_NUMBER.test('// the fallback #622 retired')).toBe(true)
    expect(ISSUE_NUMBER.test('a sweep found the same shape (#621).')).toBe(true)
    expect(RECORD_NUMBER.test(' * The type ladder, and the guards that hold it. ADR 0012.')).toBe(
      true,
    )
    expect(RECORD_NUMBER.test('places it (ADR 0003). The import mints a row')).toBe(true)
    expect(RECORD_NUMBER.test(' * comes from `tokenModel` (ADR 6), so widening it')).toBe(true)
    expect(
      RECORD_NUMBER.test('   * `canWrite`. See `docs/adr/0011-one-question-a-surface-may-ask.md`.'),
    ).toBe(true)
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

  it('reads a test name and a failure message, which is what a reader has when it fails', () => {
    // The two shapes a person meets at the worst moment.
    expect(proseLines("it('drops the fallback #622 keeps', fn)\n", 'a.test.ts')).toEqual([
      { line: 1, text: 'drops the fallback #622 keeps' },
    ])
    expect(proseLines("expect(found, 'drifted from ADR 0011').toEqual([])\n", 'a.test.ts')).toEqual(
      [{ line: 1, text: 'drifted from ADR 0011' }],
    )
    // A thrown message reaches a reader the same way.
    expect(proseLines("throw new Error('the shape ADR 0012 names')\n", 'a.ts')).toEqual([
      { line: 1, text: 'the shape ADR 0012 names' },
    ])
    // A suite name, and a name spelled through a modifier.
    expect(proseLines("describe('the rule ADR 6 states', fn)\n", 'a.test.ts')).toEqual([
      { line: 1, text: 'the rule ADR 6 states' },
    ])
    expect(proseLines("it.each(rows)('row ADR 6 names', fn)\n", 'a.test.ts')).toEqual([
      { line: 1, text: 'row ADR 6 names' },
    ])
    // The table a curried declaration takes is data, not a name.
    expect(proseLines("it.each(['#475569'])('%s', fn)\n", 'a.test.ts')).toEqual([
      { line: 1, text: '%s' },
    ])
  })

  it('leaves the data beside the message alone, so a fixture needs no exemption', () => {
    // `expect(value, message)` compares the first argument and narrates the
    // rest. A swatch is compared, so it is never read as a citation.
    expect(proseLines("expect(swatch).toBe('#475569')\n", 'a.test.ts')).toEqual([])
    expect(proseLines("expect(ISSUE_NUMBER.test('see #12')).toBe(true)\n", 'a.test.ts')).toEqual([])
    // A test's name is its first argument; its body is addressed to the
    // compiler again.
    expect(proseLines("it('name', () => { const c = '#475569' })\n", 'a.test.ts')).toEqual([
      { line: 1, text: 'name' },
    ])
    // And a quoted string with nobody calling it is not addressed to anyone.
    expect(proseLines("const label = 'interview #4'\n", 'a.ts')).toEqual([])
  })

  it('reads the message the session pin carried while the extractor read comments only', () => {
    // The verbatim shapes that survived a sweep and were found by hand. They
    // are the reason the extractor stopped at the quote mark being a bug.
    const pin = [
      "    it('publishes exactly the keys ADR 0011 names, and not the tier', () => {",
      '      expect(',
      '        keys,',
      "        'Published session keys drifted from ADR 0011. See docs/adr/0011-one-question-a-surface-may-ask.md.',",
      '      ).toEqual(PUBLISHED)',
      '    })',
      '',
    ].join('\n')
    const read = proseLines(pin, 'supabaseProviderPublishedSurface.test.tsx')
    expect(read.filter(({ text }) => RECORD_NUMBER.test(text)).length).toBe(2)
  })
})
