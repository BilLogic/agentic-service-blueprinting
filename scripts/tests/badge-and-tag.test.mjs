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
 * Comments are deliberately not the subject. A codebase is allowed to say why
 * a word left; it is not allowed to go on using it. A guard that read comments
 * could not be satisfied by any tree that explains its own history, and this
 * one has to survive a file whose whole job is to record the rename.
 *
 * `src` is the whole subject for the same reason `supabase/migrations` is not:
 * a migration is a DATED RECORD of what was applied on a day, and rewriting a
 * record is worse than the word it removes. `lane_role`'s catalogue comment
 * still reads "pill cells" because no migration has changed it, so the
 * documents that quote that comment — `references/data-model.md`,
 * `references/ir-schema.json`, `agents/render-checker.md`, `CONTEXT.md`'s lane
 * definition — quote it accurately and are outside this file. They move when
 * the comment does.
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

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return walk(path)
    if (!/\.(tsx?|css)$/.test(entry)) return []
    return [path]
  })
}

/** Every TypeScript and stylesheet file under `src`, comments stripped. */
export function appSources() {
  return walk(SRC)
    .map((path) => ({
      file: relative(ROOT, path).split('\\').join('/'),
      code: stripComments(readFileSync(path, 'utf8')),
    }))
    .sort((a, b) => a.file.localeCompare(b.file))
}

/* ------------------------------------------------------- pill as a name */

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

test('the check reads names and not comments', () => {
  // The subject, stated as a passing case. This is the file that would fail if
  // the guard read what it excludes — every sentence below is one this repo
  // legitimately writes about its own history.
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
