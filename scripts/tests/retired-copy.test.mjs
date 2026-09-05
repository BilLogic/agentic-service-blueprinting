/**
 * Check C — the words a person reads on screen match the words in the schema.
 *
 * Identifier drift between the app and the database is nearly impossible here:
 * `src/types/database.ts` is generated from a built database, so every table
 * and column name reaches TypeScript by machine and `tsc` fails if the app
 * disagrees. Everything a rename breaks sits in the places the generator cannot
 * reach, and this is the last of them. Nothing asserts that a label says "lane"
 * when the table says `lanes`. It is true today because `21000104` was done
 * carefully by hand, which is not a mechanism.
 *
 * SUBJECT: JSX text nodes, and the props that reach a reader — `aria-label`,
 * `title`, `placeholder`, `alt`, `label`. Nothing else. Not comments, not
 * identifiers, not imports, not test files, not `data-*`, and not a string that
 * names a database object — that is Check B, a different check with a different
 * subject.
 *
 * IF THIS PRODUCES A FALSE POSITIVE, NARROW THE SUBJECT — NEVER THE WORD LIST.
 * Fewer prop names, fewer node kinds. Dropping `layer` from the word list to
 * silence one legitimate use converts this into a rule that never covered
 * `layer` at all, and the next person cannot tell the difference.
 *
 * `CanvasAnnotationLayer` is the case that tests this. It is a rendering layer
 * and a legitimate use of the word — but it is an identifier, and identifiers
 * are not the subject, so it needs no exemption. If it ever reaches a label a
 * user reads, the honest fix is to rename the label, not the list.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { sourceFilesUnder } from '../check-database-names.mjs'
import { RETIRED_COPY_WORDS } from '../retired-vocabulary.mjs'
import { COVER_ASSET_MANIFEST } from '../sync-cover-assets.mjs'

const REPO_ROOT = resolve(new URL('../..', import.meta.url).pathname)

/** The props whose string value a person reads. */
const READER_FACING_PROPS = ['aria-label', 'title', 'placeholder', 'alt', 'label']

const PROP_VALUE = new RegExp(
  `\\b(${READER_FACING_PROPS.join('|')})\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{\\s*['"\`]([^'"\`]*)['"\`]\\s*\\})`,
  'g',
)

/**
 * Text sitting between a closing `>` and the next opening `<`, carrying no
 * braces — a JSX text node, near enough. A real parser would be better and is
 * not worth a dependency: the only way this misreads ordinary code is a
 * comparison like `a > b && c < d`, and that has to contain a retired word
 * before anyone hears about it.
 */
const JSX_TEXT = />([^<>{}]+)</g

/** Each retired spelling as a whole-word pattern, spaces matching any run. */
const PATTERNS = RETIRED_COPY_WORDS.map((word) => ({
  word,
  pattern: new RegExp(`\\b${word.replace(/\s+/g, '\\s+')}\\b`, 'i'),
}))

/**
 * Comments removed, because the header says they are not the subject and the
 * extraction has to agree with it.
 *
 * `JSX_TEXT` reads between a `>` and the next `<`, which a doc comment
 * containing a backticked `` `<textarea>` `` opens: everything from there to
 * the next real `<` — the whole of `panelShell.tsx`'s error-boundary
 * paragraph — arrived as one "reader-facing string". A prose sentence is
 * exactly what this guard is told not to read, and the fix the header names
 * for a false positive is to narrow the SUBJECT.
 *
 * The same shape as `scripts/tests/badge-and-tag.test.mjs`'s, spelled out here
 * rather than imported: a test file importing another test file registers that
 * file's tests twice.
 */
export function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** Every `.tsx` in the app, as `{ file, code }`. */
function appFiles() {
  return sourceFilesUnder('src')
    .filter((abs) => abs.endsWith('.tsx'))
    .map((abs) => ({
      file: relative(REPO_ROOT, abs).split('\\').join('/'),
      code: stripComments(readFileSync(abs, 'utf8')),
    }))
}

/** Every reader-facing string in the app, with where it came from. */
export function readerFacingStrings(files = appFiles()) {
  const out = []
  for (const { file, code } of files) {
    if (!file.endsWith('.tsx')) continue
    for (const match of code.matchAll(PROP_VALUE)) {
      const value = match[2] ?? match[3] ?? match[4]
      if (value) out.push({ file, where: `${match[1]}=`, value })
    }
    for (const match of code.matchAll(JSX_TEXT)) {
      const value = match[1].trim()
      if (value && /[A-Za-z]/.test(value)) out.push({ file, where: 'text', value })
    }
  }
  return out
}

/** Reader-facing strings carrying a retired spelling. */
export function offenders(strings = readerFacingStrings()) {
  return strings.flatMap((entry) => {
    const hit = PATTERNS.find(({ pattern }) => pattern.test(entry.value))
    return hit ? [`${entry.file} (${entry.where}) "${entry.value}" — "${hit.word}"`] : []
  })
}

test('no retired spelling reaches a reader', () => {
  const found = offenders()
  assert.deepEqual(
    found,
    [],
    'A retired word is on screen. The schema, the docs and the agent all use the ' +
      'current one, and a UI that disagrees is the same defect as a doc asserting ' +
      `an interface the code lacks — pointed at the user instead:\n${found.join('\n')}`,
  )
})

test('the guard reads the props and the text nodes it claims to', () => {
  // The subject, exercised directly. A guard whose extraction is wrong reports
  // nothing and looks identical to a codebase that is clean — which is the
  // whole failure mode this file exists to avoid, so it cannot rely on the
  // corpus happening to contain an example.
  const planted = [
    {
      file: 'components/planted.tsx',
      code: [
        '<Button aria-label="Add a layer">',
        '  <span>Every lifecycle starts here</span>',
        '</Button>',
        '<Field placeholder="row position" label={"Propositions"} />',
        '<img alt="a service scenario" />',
      ].join('\n'),
    },
  ]
  const found = offenders(readerFacingStrings(planted)).map((one) => one.split(' — ')[1])
  assert.deepEqual(found.sort(), [
    '"layer"',
    '"lifecycle"',
    '"propositions"',
    '"row position"',
    '"service scenario"',
  ])
})

test('the guard does not read what it excludes', () => {
  const quiet = [
    {
      file: 'components/quiet.tsx',
      code: [
        // An identifier, an import, a data attribute and a database name are
        // each somebody else's subject. `CanvasAnnotationLayer` is the real
        // case: a rendering layer, legitimately named, and not copy.
        "import { CanvasAnnotationLayer } from '@/components/canvas'",
        '<div data-canvas-annotation-layer className="layer-1">',
        "  {supabase.from('service_lifecycles')}",
        '</div>',
      ].join('\n'),
    },
    { file: 'lib/not-a-component.ts', code: '<span>the layer</span>' },
  ]
  assert.deepEqual(offenders(readerFacingStrings(quiet)), [])
})

/**
 * The one word this list keys on the plural, stated here rather than left to
 * the list to be read as an oversight.
 *
 * `21000111` renamed the table `propositions`; it did not retire the English
 * noun. Its own header says what the collision was — the word "already means
 * something else one level down: a CELL's value proposition" — and
 * `cells.value_props` is that phrase abbreviated. So the panel label
 * `Value proposition` (#89) is the schema's own word spelled out, and a word
 * list that flagged it would be pushing a reader away from the name of the
 * column they are editing.
 *
 * This is not the forbidden move the header above describes. Dropping `layer`
 * to silence a legitimate use would leave the retired NAME uncovered; the
 * retired name here is the plural, and the plural is still on the list.
 */
test('the singular is a live word, and only the retired plural is flagged', () => {
  const planted = [
    {
      file: 'components/planted.tsx',
      code: [
        '<Field label="Value proposition" />',
        '<Field label={"Propositions"} />',
      ].join('\n'),
    },
  ]
  const found = offenders(readerFacingStrings(planted)).map((one) => one.split(' — ')[1])
  assert.deepEqual(found, ['"propositions"'])
})

/* ------------------------------------------------------------- the figures */

/**
 * SECOND SUBJECT: the text inside the authored diagrams.
 *
 * `docs/assets/` is where the figures are authored; `sync-cover-assets.mjs`
 * copies them to the gitignored `public/cover/` at predev and prebuild, and
 * `CoverPage` renders them **inside the app**. So a word in a `<text>` node
 * reaches a reader the way a heading does, and it reaches every instance built
 * from this template as well.
 *
 * Added because the first subject could not see them at all. Every rename this
 * repository has run — `service_lifecycles` to `services`, `layers` to `lanes`,
 * `propositions` to `business_model` — had to be carried into these files by
 * hand, and a figure that was missed would say the retired word on every cover
 * page built from this template with nothing reporting it. Any copy of these
 * files kept outside this repository inherits that, which is the reason to fix
 * the mechanism here rather than in the copies.
 *
 * This is a widened SUBJECT, not a widened word list. Same
 * `RETIRED_COPY_WORDS`, same `offenders()`; only where a reader-facing string
 * is looked for has changed.
 *
 * `<text>` only. Not `id`, not `class`, not an SVG comment, not the filename —
 * a figure called `four-ways-in.svg` is nobody's copy. `public/cover/` is
 * deliberately NOT read: it is generated, gitignored, and a check that reads
 * build output reports the same finding twice.
 */
const FIGURES = resolve(REPO_ROOT, 'docs/assets')

/** `<text>` content, with any `<tspan>` markup inside it flattened away. */
const SVG_TEXT = /<text\b[^>]*>([\s\S]*?)<\/text>/g

export function figureStrings(files = figureFiles()) {
  const out = []
  for (const { file, code } of files) {
    for (const match of code.matchAll(SVG_TEXT)) {
      const value = match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      if (value && /[A-Za-z]/.test(value)) out.push({ file, where: 'text', value })
    }
  }
  return out
}

function figureFiles() {
  return readdirSync(FIGURES)
    .filter((name) => name.endsWith('.svg'))
    .sort()
    .map((name) => ({
      file: `docs/assets/${name}`,
      code: readFileSync(resolve(FIGURES, name), 'utf8'),
    }))
}

test('no retired spelling reaches a reader through a figure', () => {
  const found = offenders(figureStrings())
  assert.deepEqual(
    found,
    [],
    'A retired word is on screen in a diagram. These render in the app through ' +
      `the cover page, not only in a README:\n${found.join('\n')}`,
  )
})

test('the figure guard reads the text nodes it claims to', () => {
  // The extraction, on the shapes the real files use: a plain node, one broken
  // across lines, one built from tspans, and the attributes NOT read.
  const planted = [
    {
      file: 'docs/assets/planted.svg',
      code: [
        '<text x="10" y="20" class="uiLabel">Service lifecycle</text>',
        '<text x="10" y="40">a row',
        '  position</text>',
        '<text x="10" y="60"><tspan>one</tspan> <tspan>lane</tspan></text>',
        '<rect id="layer-1" class="layer" data-note="the layer"/>',
        '<!-- a lifecycle in a comment is not copy -->',
      ].join('\n'),
    },
  ]
  const strings = figureStrings(planted)
  assert.deepEqual(
    strings.map((one) => one.value),
    ['Service lifecycle', 'a row position', 'one lane'],
  )
  assert.deepEqual(
    offenders(strings).map((one) => one.split(' — ')[1]).sort(),
    ['"lifecycle"', '"row position"'],
  )
})

test('every authored figure is covered, and there are some', () => {
  // A reader that found no files would pass the assertion above in silence,
  // which is the failure mode this whole file is written against.
  const files = figureFiles()
  assert.equal(files.length, COVER_ASSET_MANIFEST.length)
  assert.ok(figureStrings(files).length > 100, 'the figures parsed to almost no text')
})
