/**
 * Check D — neither "chip" nor "pill" is a name in this app.
 *
 * The `pill`/`chip` row of `scripts/retired-vocabulary.mjs` enforces nothing in
 * the identifier sweep and says so: no database object was ever called either
 * word, and a guard that cannot fire is a comment wearing a check's clothes.
 * The row's copy list covers what a reader sees, which `retired-copy.test.mjs`
 * holds. Between the two sat the whole of the app's own vocabulary — a
 * component, a prop, a constant, a variant string, a data attribute, a file
 * name — with nothing but review watching it. #160 renamed the touchpoint half
 * and left `FloatingSidebarPill`, `SliceRefocusPill` and `PathNotionPill`
 * standing, which is how a rename held by review ends.
 *
 * SUBJECT: every `.ts`, `.tsx` and `.css` file under `src`, COMMENTS REMOVED,
 * plus the file names themselves. Test files are in — a test asserting against
 * a retired name carries it as surely as the component would.
 *
 * COMMENTS ARE THE SECOND SUBJECT, SINCE #358. They were excluded on the
 * argument that a codebase is allowed to say why a word left, and that a guard
 * reading comments could not be satisfied by any tree that explains its own
 * history. That argument was right about the DOCUMENTS and wrong about the
 * axis. What it protects is the rename map and this file, and both live under
 * `scripts/`, outside a subject that was always `src`. Inside `src` a comment
 * is not history — it is the sentence the next reader learns the name from,
 * which is how `layer` survived `21000104` in eleven places (#327) and `chip`
 * survived #324 in forty. So one walk now feeds two assertions: the names it
 * keeps, and the comments it strips out.
 *
 * NO EXEMPTION LIST, and that is a property of the subject rather than an
 * omission. The four documents this repository exempts everywhere else — this
 * file, `.changeset/`, `CHANGELOG.md` and `supabase/migrations/` — are outside
 * `src` by construction, so nothing whose job is to write the retired word
 * down is ever read. An exemption list is where a real finding hides; the
 * cheapest one is the list the subject makes unnecessary.
 *
 * `src` is the whole subject for the same reason `supabase/migrations` is not:
 * a migration is a DATED RECORD of what was applied on a day, and rewriting a
 * record is worse than the word it removes. `lane_role`'s catalogue comment
 * still reads "pill cells" because no migration has changed it, so the
 * documents that quote that comment — `references/data-model.md`,
 * `references/ir-schema.json`, `agents/render-checker.md`, `CONTEXT.md`'s lane
 * definition — quote it accurately and are outside this file. They move when
 * the comment does. (The vendored mirror of the first of those does sit under
 * `src`, and is markdown: the walk's extension filter never opens it.)
 *
 * BOTH WORDS, SINCE #324. `pill` came first (#158) because `chip` was still a
 * live NAME here — `coverContent.chip`, the cover's copy-button strings, named
 * before the design system split the two ideas. That rename is done: the key is
 * `commandCopy`, the component is `CoverCommandCopy`, the ledger's markers are
 * a `VerdictBadge`, a `FilterTag` and a `CompareZoneBadge`, and the deployment's
 * spelling is what each of them took. So the subject is the row's whole pair
 * now, which is what the instance's own `badge-and-tag.test.mjs` — the file
 * this is modelled on and now named for — has held all along.
 *
 * Proved to go red below, in the shape the rest of this directory argues for:
 * a check that is green against this tree could equally be a check that
 * examines nothing.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const ROOT = resolve(new URL('../..', import.meta.url).pathname)
const SRC = resolve(ROOT, 'src')

/* --------------------------------------------------------------- the tree */

/** Block and line comments removed, so only names are left to read. */
export function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** A block comment, or a line comment whose `//` is not part of a URL. */
const COMMENT = /\/\*[\s\S]*?\*\/|(^|[^:])(\/\/.*)$/gm

/**
 * The complement of `stripComments`: every comment kept, every other character
 * blanked to a space.
 *
 * Blanked rather than collected, so a line number still means what it says —
 * the report below is `file:line`, and a guard that names the wrong line is a
 * guard nobody trusts twice. It is written against the same two patterns
 * instead of subtracting one result from the other, because positions shift
 * the moment anything is removed.
 */
export function commentsOnly(source) {
  const out = source.replace(/[^\n]/g, ' ').split('')
  for (const match of source.matchAll(COMMENT)) {
    const text = match[2] ?? match[0]
    const start = match.index + (match[2] ? match[1].length : 0)
    for (let i = 0; i < text.length; i += 1) {
      if (text[i] !== '\n') out[start + i] = text[i]
    }
  }
  return out.join('')
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return walk(path)
    if (!/\.(tsx?|css)$/.test(entry)) return []
    return [path]
  })
}

/**
 * Every TypeScript and stylesheet file under `src`, split into its two halves:
 * `code` is the file with comments stripped, `comments` is what the stripping
 * removed. One walk, because the two assertions below are one subject read
 * twice and a second walk would be a second thing to keep in step.
 */
export function appSources() {
  return walk(SRC)
    .map((path) => {
      const source = readFileSync(path, 'utf8')
      return {
        file: relative(ROOT, path).split('\\').join('/'),
        code: stripComments(source),
        comments: commentsOnly(source),
      }
    })
    .sort((a, b) => a.file.localeCompare(b.file))
}

/* --------------------------------------------- chip and pill, as names */

/** The two words that stopped being names. */
export const RETIRED_DESIGN_WORDS = Object.freeze(['chip', 'pill'])

const SAYS_RETIRED = new RegExp(`(${RETIRED_DESIGN_WORDS.join('|')})`, 'i')

/** Every name in the tree that still says chip or pill, with where it is. */
export function namesThatSayChipOrPill(sources) {
  const out = []
  for (const { file, code } of sources) {
    if (SAYS_RETIRED.test(file)) out.push(`${file} — the file name`)
    code.split('\n').forEach((line, index) => {
      if (SAYS_RETIRED.test(line)) out.push(`${file}:${index + 1} ${line.trim()}`)
    })
  }
  return out
}

test('no name in the app says chip or pill', () => {
  const found = namesThatSayChipOrPill(appSources())
  assert.deepEqual(
    found,
    [],
    'A name says "chip" or "pill". The design system has two words: a BADGE ' +
      'describes the thing it sits on, a TAG is one value out of a set. Both ' +
      'retired words were a third and fourth name for those two ideas, and a ' +
      'touchpoint is a cell with a shape variant rather than a shape of its ' +
      `own:\n${found.join('\n')}`,
  )
})

test('the check goes red on a name that reintroduces the word', () => {
  const planted = [
    {
      file: 'src/components/editor/FloatingSidebarPill.tsx',
      code: 'export function FloatingSidebarPill() {}',
    },
    {
      file: 'src/components/cover/CoverCommandChip.tsx',
      code: 'export const chip = 1',
    },
    { file: 'src/lib/quiet.ts', code: "export const PILL_HEIGHT = 52\nconst x = 'pills'" },
  ]
  assert.deepEqual(namesThatSayChipOrPill(planted), [
    'src/components/editor/FloatingSidebarPill.tsx — the file name',
    'src/components/editor/FloatingSidebarPill.tsx:1 export function FloatingSidebarPill() {}',
    'src/components/cover/CoverCommandChip.tsx — the file name',
    'src/components/cover/CoverCommandChip.tsx:1 export const chip = 1',
    'src/lib/quiet.ts:1 export const PILL_HEIGHT = 52',
    "src/lib/quiet.ts:2 const x = 'pills'",
  ])
})

/** The two fixtures both halves are proved against — see below. */
const NAMED_NOTHING = Object.freeze([
  {
    file: 'src/components/editor/Quiet.tsx',
    code: [
      '/* The collapsed remnant used to be a pill with its own name. */',
      'export function FloatingSidebarNavbar() {} // was a chip',
    ].join('\n'),
  },
  {
    file: 'src/styles/quiet.css',
    code: '/* a touchpoint, once a chip, sits a step paler */\n.cell { color: red; }',
  },
])

test('the name check reads names and not comments', () => {
  // The name half's subject, stated as a passing case: neither file names
  // anything retired, so this half must stay silent on both. The comment half
  // below reads exactly these lines and fails on them, which is the whole of
  // what #358 changed — the two are one corpus read on two axes, not one
  // check that grew a second opinion.
  const quiet = [
    {
      file: 'src/components/editor/Quiet.tsx',
      code: [
        '/* The collapsed remnant used to be a pill with its own name. */',
        'export function FloatingSidebarNavbar() {} // was a chip',
      ].join('\n'),
    },
    {
      file: 'src/styles/quiet.css',
      code: '/* a touchpoint, once a chip, sits a step paler */\n.cell { color: red; }',
    },
  ].map(({ file, code }) => ({ file, code: stripComments(code) }))
  assert.deepEqual(namesThatSayChipOrPill(quiet), [])
})

/* ------------------------------------------ chip and pill, in a comment */

/** Every comment in the tree that still says chip or pill, with where it is. */
export function commentsThatSayChipOrPill(sources) {
  const out = []
  for (const { file, comments } of sources) {
    comments.split('\n').forEach((line, index) => {
      if (SAYS_RETIRED.test(line)) out.push(`${file}:${index + 1} ${line.trim()}`)
    })
  }
  return out
}

test('no comment in the app says chip or pill', () => {
  const found = commentsThatSayChipOrPill(appSources())
  assert.deepEqual(
    found,
    [],
    'A comment says "chip" or "pill". A comment inside `src` is where the next ' +
      'reader learns what to call the thing, so it teaches the retired name as ' +
      'surely as a component would: a BADGE describes the thing it sits on, a ' +
      'TAG is one value out of a set. Where neither word is what the sentence ' +
      'means, say what it means — a filled square, an attachment, a button — ' +
      `rather than reaching for a third:\n${found.join('\n')}`,
  )
})

test('the comment check goes red on the sentences the name check ignores', () => {
  const planted = NAMED_NOTHING.map(({ file, code }) => ({
    file,
    code: stripComments(code),
    comments: commentsOnly(code),
  }))
  assert.deepEqual(namesThatSayChipOrPill(planted), [])
  assert.deepEqual(commentsThatSayChipOrPill(planted), [
    'src/components/editor/Quiet.tsx:1 ' +
      '/* The collapsed remnant used to be a pill with its own name. */',
    'src/components/editor/Quiet.tsx:2 // was a chip',
    'src/styles/quiet.css:1 /* a touchpoint, once a chip, sits a step paler */',
  ])
})

test('the comment reader keeps the line numbers and drops the code', () => {
  // The extraction, on the shapes the corpus actually holds: a bare code line,
  // a block spanning two lines, a `//` inside a URL (which is the reason
  // `stripComments` carries `(^|[^:])` at all), and a trailing comment.
  const source = [
    'const a = 1',
    '/* block',
    '   spanning */',
    "const url = 'https://example.com' // after a URL",
    'const b = 2 // trailing',
  ].join('\n')
  const lines = commentsOnly(source).split('\n')
  assert.equal(lines.length, 5, 'a blanked line went missing')
  assert.deepEqual(
    lines.map((line) => line.trim()),
    ['', '/* block', 'spanning */', '// after a URL', '// trailing'],
  )
  // Blanked, not deleted: the comment sits where it sat.
  assert.equal(lines[4].indexOf('//'), source.split('\n')[4].indexOf('//'))
})

test('the walk reads the comments it claims to', () => {
  // The same fact the name walk asserts, one axis over. A reader that returned
  // nothing would satisfy the assertion above in silence.
  const sources = appSources()
  const written = sources.flatMap(({ comments }) =>
    comments.split('\n').filter((line) => line.trim() !== ''),
  )
  assert.ok(written.length > 1000, `only ${written.length} comment lines were read`)
  assert.ok(sources.some(({ comments }) => comments.includes('badge')))
})

test('the walk reads the tree it claims to', () => {
  // A guard whose extraction is wrong reports nothing and looks identical to a
  // clean codebase. Two facts about the corpus, cheap and load-bearing: the
  // stylesheet is in (its comments carried the word until this change), and the
  // renamed component is there under its current name.
  const sources = appSources()
  assert.ok(sources.some(({ file }) => file === 'src/styles/blueprint.css'))
  assert.ok(
    sources.some(({ code }) => code.includes('export function FloatingSidebarNavbar')),
  )
})
