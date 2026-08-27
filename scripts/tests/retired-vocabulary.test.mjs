/**
 * The two maps, held together, and the rules that keep an exemption honest.
 *
 * `CONTEXT.md` documents the rename map for people; `scripts/retired-vocabulary.mjs`
 * enforces it for CI. Neither derives from the other — a prose table should not
 * be load-bearing for a build, and a check that parses prose acquires an
 * exemption for every sentence that merely mentions a word. What is not
 * tolerable is the two disagreeing, because then the file people read to learn
 * the vocabulary is lying. So: two lists, and this file.
 *
 * The exemption rules live here too, because they are the same argument. An
 * exemption that cannot expire is how upstream's `Layer` breadcrumb survived
 * six months as a "temporary" sequencing note.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { RENAME_MAP, RETIRED_COPY_WORDS, RETIRED_IDENTIFIER_FRAGMENTS } from '../retired-vocabulary.mjs'
import { RETIRED_IDENTIFIER_EXEMPTIONS } from '../check-retired-identifiers.mjs'
import { DATABASE_NAME_EXEMPTIONS } from '../check-database-names.mjs'

const ROOT = resolve(new URL('../..', import.meta.url).pathname)
const CONTEXT = readFileSync(resolve(ROOT, 'CONTEXT.md'), 'utf8')

/* --------------------------------------------------------------- CONTEXT.md */

/** The `| … | … | … |` rows under the rename-map heading, as raw cells. */
function documentedRows() {
  const section = /##\s+The rename map[^\n]*\n([\s\S]*?)\n##\s/.exec(CONTEXT)
  assert.ok(section, 'CONTEXT.md has no "## The rename map" section any more')
  return section[1]
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .map((line) =>
      line
        .trim()
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim()),
    )
    .filter((cells) => cells.length === 3 && !/^-+$/.test(cells[0].replace(/[\s:]/g, '')))
    .filter((cells) => cells[0].toLowerCase() !== 'was')
}

/** The `code spans` in a table cell, in order — the part that is data. */
const codeSpans = (cell) => [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1])

/** The rename table removed, so the rest of the file is definitions. */
function contextWithoutRenameTable() {
  return CONTEXT.split('\n')
    .filter((line) => !line.trim().startsWith('|'))
    .join('\n')
}

test('the enforced rename map still matches the one CONTEXT.md documents', () => {
  const documented = documentedRows().map((cells) => ({
    was: codeSpans(cells[0]),
    is: codeSpans(cells[1]),
    migrations: codeSpans(cells[2]),
  }))
  const enforced = RENAME_MAP.map((row) => ({
    was: [...row.was],
    is: [...row.is],
    migrations: [...row.migrations],
  }))
  assert.deepEqual(
    documented,
    enforced,
    'CONTEXT.md and scripts/retired-vocabulary.mjs disagree about the rename map. ' +
      'Whichever is right, the other is telling somebody the wrong thing.',
  )
})

test('every enforced fragment comes from the row it sits in', () => {
  for (const row of RENAME_MAP) {
    for (const fragment of row.retired) {
      assert.ok(
        row.was.some((was) => was.toLowerCase().includes(fragment.toLowerCase())),
        `"${fragment}" is enforced on the ${row.was.join('/')} row but is not part of ` +
          'any name that row says was retired — the enforced word has wandered.',
      )
    }
  }
})

test('every copy spelling comes from an identifier the same row retired', () => {
  for (const row of RENAME_MAP) {
    for (const word of row.copy) {
      const collapsed = word.replace(/\s+/g, '')
      assert.ok(
        row.was.some((was) => was.toLowerCase().replace(/[_.*]/g, '').includes(collapsed.replace(/s$/, ''))),
        `the copy spelling "${word}" does not correspond to anything the ` +
          `${row.was.join('/')} row retired.`,
      )
    }
  }
})

/**
 * A row may enforce nothing — but only out loud.
 *
 * `description` is the case: it was renamed on five tables and is still the
 * right word on a sixth, so no identifier fragment can be keyed on it without
 * an exemption list longer than the rule. That is a real judgement, and the
 * place a reader will look for it is CONTEXT.md, not a code comment.
 */
test('a row that enforces nothing is explained in CONTEXT.md', () => {
  const prose = contextWithoutRenameTable()
  for (const row of RENAME_MAP) {
    if (row.retired.length > 0 || row.copy.length > 0) continue
    const word = row.was[0]
    assert.ok(
      prose.includes(word),
      `the ${word} row enforces nothing and CONTEXT.md does not say why. ` +
        'A word the checks deliberately ignore has to be documented as a live ' +
        'word, or the next person reads the gap as an oversight and closes it.',
    )
  }
})

/* ---------------------------------------------------------------- exemptions */

const ALL_EXEMPTIONS = [
  ...RETIRED_IDENTIFIER_EXEMPTIONS.map((entry) => ({ ...entry, list: 'identifier' })),
  ...DATABASE_NAME_EXEMPTIONS.map((entry) => ({ ...entry, list: 'database name' })),
]

test('every exemption states a reason, and an expiry or nothing', () => {
  for (const entry of ALL_EXEMPTIONS) {
    assert.ok(
      entry.because && entry.because.length > 20,
      `${entry.identifier} (${entry.list}) needs a reason a stranger can evaluate`,
    )
    if (entry.until !== undefined) {
      assert.match(
        entry.until,
        /^#\d+$/,
        `${entry.identifier} expires on "${entry.until}" — an expiry is an issue number`,
      )
    }
  }
})

/**
 * A permanent exemption is a claim that the word means something here, and a
 * claim about what a word means belongs in the file that defines words.
 * Without this, "permanent" quietly means "nobody got round to it".
 */
test('every permanent exemption rests on a word CONTEXT.md defines', () => {
  const prose = contextWithoutRenameTable().toLowerCase()
  const undefined_ = ALL_EXEMPTIONS.filter((entry) => !entry.until).filter(
    (entry) =>
      !RETIRED_IDENTIFIER_FRAGMENTS.concat(RETIRED_COPY_WORDS).every((word) =>
        entry.identifier.toLowerCase().includes(word) ? prose.includes(word) : true,
      ),
  )
  assert.deepEqual(
    undefined_.map((entry) => entry.identifier),
    [],
    'A permanent exemption rests on a word CONTEXT.md does not define outside the ' +
      'rename table. Give the word a glossary entry saying what it means here and ' +
      'why it survives, or give the exemption an `until`.',
  )
})

/**
 * Zero is the number to protect.
 *
 * Both lists are empty, and that was designed rather than lucky — the two words
 * that could have needed an entry are handled in the map instead: `description`
 * enforces nothing, and `propositions` keys on the plural so
 * `evidence.proposition_question_key` was never a case to argue about. If a
 * future rename adds an entry here, this test is where someone has to say so on
 * purpose, and the three tests above start applying to it.
 */
test('the exemption lists are empty, and adding to one is a deliberate act', () => {
  assert.deepEqual(
    ALL_EXEMPTIONS.map((entry) => `${entry.list}: ${entry.identifier}`),
    [],
    'An exemption was added. That may well be right — but update this test with ' +
      'the reason, so the next reader sees a decision rather than a list that grew.',
  )
})
