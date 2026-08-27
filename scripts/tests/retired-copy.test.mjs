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
import { readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { sourceFilesUnder } from '../check-database-names.mjs'
import { RETIRED_COPY_WORDS } from '../retired-vocabulary.mjs'

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

/** Every `.tsx` in the app, as `{ file, code }`. */
function appFiles() {
  return sourceFilesUnder('src')
    .filter((abs) => abs.endsWith('.tsx'))
    .map((abs) => ({
      file: relative(REPO_ROOT, abs).split('\\').join('/'),
      code: readFileSync(abs, 'utf8'),
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
