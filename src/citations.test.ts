import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

import { DOCUMENT_PATH, ISSUE_NUMBER, RECORD_NUMBER, proseLines } from './citations'

/*
 * NO FILE UNDER `src/` CITES A NUMBER, OR A DOCUMENT AN ADOPTER LACKS.
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
 * A document path is the third, and it is the one with real exceptions, so it
 * gets `EXEMPT` below rather than a blanket. `citations.ts` carries the test:
 * a `docs/` path is a defect when it reaches an adopter as a DANGLING
 * REFERENCE, which is a question about whose tree the reader is standing in,
 * not about the spelling.
 *
 * Documentation, ADRs and changesets are out of scope. They are this
 * repository talking to itself, and a citation there resolves where it was
 * written. Scripts are out of scope HERE and in scope in
 * `scripts/tests/a-shared-script-cites-no-local-path.test.mjs`, over the
 * scripts this package publishes for a deployment to hold byte-identical —
 * `scripts/` is the one tree where the shared files and this repository's own
 * sit side by side, so the subject has to be named rather than walked.
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

/**
 * Files whose `docs/` paths are NOT dangling references, each with the reason
 * it is not. Nothing else under `src/` may name one. The numbers have no
 * equivalent list, because a number has no such case.
 */
const EXEMPT = new Map([
  [
    GENERATED,
    // The vendored rulebook is read by an agent out of this package's own
    // installed tree, and `docs/` ships in the package with it: `npm pack`
    // carries `docs/erd.mmd` and the connector document alongside the
    // references that name them. `check:doc-paths` is the authority over
    // these paths and REQUIRES them to resolve here, which is the demand this
    // guard would otherwise make impossible to meet. It holds them true; this
    // guard stays out of the way. Fix a stale one at its source under
    // `references/` or `skills/`.
    'read out of this package, where docs/ ships beside it — check:doc-paths holds these true',
  ],
  [
    join('components', 'cover', 'packageCoverFigures.ts'),
    // The module whose subject IS that directory: it `import`s each figure
    // from `../../../docs/assets/`, so the prose naming the folder is naming
    // the specifier one line below it. That path is relative to this file and
    // resolves wherever the package is read from — `npm pack` carries `docs/`,
    // which is the same reason the vendored rulebook is exempt. A deployment
    // reading this module stands inside the package, not in its own tree, so
    // the reference does not dangle. Rewording it to avoid the folder would
    // describe the import without being allowed to name it.
    'the module that imports from docs/assets/ — the path resolves wherever the package is read',
  ],
  [
    join('content', 'coverContent.ts'),
    // This package's own sample cover, about this package's own documentation.
    // A deployment supplies `DeploymentConfig.cover` and the resolved cover IS
    // that object — replaced whole, never merged, so none of these paths
    // shows through. Un-replaced they are still not dangling: a section link
    // renders as `${repoUrl}/blob/main/${docPath}`, and `repoUrl` here is this
    // package's own repository, where `docs/guide/` is exactly what the reader
    // gets. Banning them would delete true links from this package's material.
    'the sample cover, about this package’s own docs — replaced whole by DeploymentConfig.cover',
  ],
  [
    join('content', 'coverContent.test.ts'),
    'the sample cover’s own suite, which reads docs/assets/ to prove the figures exist',
  ],
  [
    join('types', 'database.ts'),
    // The header describes THIS package's schema and points at the documents
    // that ship with it. A deployment writes its own declaration — the one
    // that exists keeps `deployment/types/database.ts`, with its own `@see`
    // lines naming its own tree — so an adopter owns the header rather than
    // inheriting this one.
    'this package’s own schema declaration; a deployment writes its own, header included',
  ],
])

/** The reason `name` may name a `docs/` path, or undefined when it may not. */
function exemption(name: string): string | undefined {
  for (const [subject, reason] of EXEMPT) {
    if (name === subject || name.startsWith(subject)) return reason
  }
  return undefined
}

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
 * @param spare - names a file that may carry this citation, and why
 * @returns {string[]} `path:line: text`, empty when the rule holds
 */
function offenders(citation: RegExp, spare: (name: string) => unknown = () => false): string[] {
  return filesUnder(SRC).flatMap((path) => {
    const name = relative(SRC, path)
    if (GUARDS.has(name) || spare(name)) return []
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

  it('names no document an adopter does not have, anywhere under src/', () => {
    const found = offenders(DOCUMENT_PATH, exemption)
    expect(
      found,
      `A docs/ path is an address in this repository's tree, and a deployment reading the file stands in its own. Name the document by its subject, or add the file to EXEMPT with the reason it does not dangle:\n${found.join('\n')}`,
    ).toEqual([])
  })

  it('spares a document path only where it cannot dangle, and says why', () => {
    // The exemptions are the interesting half of this rule, so they are
    // asserted rather than left to a walk that would pass just as quietly
    // with the list empty and the files gone.
    expect(exemption(join('content', 'coverContent.ts'))).toMatch(/sample cover/)
    expect(exemption(join('content', 'coverContent.test.ts'))).toMatch(/sample cover/)
    expect(exemption(join('types', 'database.ts'))).toMatch(/own schema declaration/)
    expect(exemption(join(GENERATED, 'references', 'data-model.md'))).toMatch(/check:doc-paths/)
    expect(exemption(join('components', 'cover', 'packageCoverFigures.ts'))).toMatch(
      /resolves wherever the package is read/,
    )
    // And nothing else. An ordinary module is not spared by sitting near one.
    expect(exemption(join('lib', 'tokenModel.ts'))).toBeUndefined()
    expect(exemption(join('content', 'other.ts'))).toBeUndefined()
  })

  it('reads a document path as an address, and a fixture or a tree as neither', () => {
    // The shapes that reach an adopter with nothing behind them.
    expect(DOCUMENT_PATH.test(' * @see docs/erd.mmd — entity relationship diagram')).toBe(true)
    expect(DOCUMENT_PATH.test(' * See docs/connectors/supabase/database.md § Did it run.')).toBe(
      true,
    )
    expect(DOCUMENT_PATH.test(' * authored once in `docs/assets/` and copied to')).toBe(true)
    // A path relative to the READER is about the reader's own tree. This is
    // how `bootstrap.ts` shows a host to import its own account document.
    expect(DOCUMENT_PATH.test("import blueprintAccount from './docs/blueprint.md?raw'")).toBe(false)
    expect(DOCUMENT_PATH.test("new URL('../../docs/assets', import.meta.url)")).toBe(false)
    // The tree, and the glob over it, are not addresses.
    expect(DOCUMENT_PATH.test(' * scans every non-gitignored file, `docs/**` included')).toBe(false)
    expect(DOCUMENT_PATH.test(' * now holds `docs/`, `scripts/` and the changelog')).toBe(false)
    // And a fixture is not a citation: a test that writes `docs/t.md` into a
    // throwaway tree creates the file it names, so nobody is ever sent
    // anywhere. `proseLines` is what keeps those out — they are string
    // literals, addressed to the filesystem rather than to a reader — so the
    // rule needs no fixture exemption of its own.
    expect(proseLines("const r = repo('x', { 'docs/t.md': '' })\n", 'a.test.ts')).toEqual([])
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

  it('counts an argument, not a comma — a brace or a bracket holds its own', () => {
    // The frames were pushed by `(` alone, so every comma inside an object or
    // an array literal bumped the ENCLOSING call's argument index. One comma
    // inside argument 0 of `expect` moved the walk to argument 1, where
    // `expect` narrates, and a fixture became a citation. Nothing in the tree
    // spelled it that way yet; the first destructured fixture would have.
    expect(proseLines("expect({ a: 1, b: '#645' }).toBeTruthy()\n", 'a.test.ts')).toEqual([])
    expect(proseLines("expect([1, '#645']).toBeTruthy()\n", 'a.test.ts')).toEqual([])
    // Nested, and with the message still read where it really is.
    expect(
      proseLines("expect({ a: { b: 1, c: 2 } }, 'drifted from ADR 0011').toBe(x)\n", 'a.test.ts'),
    ).toEqual([{ line: 1, text: 'drifted from ADR 0011' }])
    // And a comma at the call's own depth still counts, which is the whole
    // reason the index is kept at all.
    expect(proseLines("expect(found, 'see ADR 0011').toEqual([])\n", 'a.test.ts')).toEqual([
      { line: 1, text: 'see ADR 0011' },
    ])
  })

  it('reads an assertion message however the assertion is spelled', () => {
    // `assert.deepEqual(actual, expected, message)` is the spelling the script
    // suites use throughout, and the pattern matched a bare `assert` only — so
    // every message in that tree read as data. Where the message sits differs
    // with the form, and the walk has to know which: `assert.ok(value,
    // message)` narrates from argument 1, a comparison from argument 2, and
    // the expected value in between is a fixture like any other.
    expect(proseLines("assert.ok(x, 'see ADR 0011')\n", 'a.test.mjs')).toEqual([
      { line: 1, text: 'see ADR 0011' },
    ])
    expect(proseLines("assert.deepEqual(a, b, 'drifted from ADR 0011')\n", 'a.test.mjs')).toEqual([
      { line: 1, text: 'drifted from ADR 0011' },
    ])
    expect(proseLines("assert(x, 'see ADR 0011')\n", 'a.test.mjs')).toEqual([
      { line: 1, text: 'see ADR 0011' },
    ])
    // The expected value of a comparison is data, and stays out.
    expect(proseLines("assert.deepEqual(found, ['#475569'])\n", 'a.test.mjs')).toEqual([])
    expect(proseLines("assert.equal(swatch, '#475569')\n", 'a.test.mjs')).toEqual([])
    // A matcher is called with data and narrates nothing.
    expect(proseLines("expect(x).toEqual(expect.arrayContaining(['#475569']))\n", 'a.test.ts')).toEqual(
      [],
    )
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
