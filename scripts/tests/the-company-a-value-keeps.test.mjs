/**
 * Check H — a value the database refuses is not offered as one, backticks or
 * no backticks, prose or picture.
 *
 * `documented-value-sets` holds every value set a document STATES, and it
 * finds those sets by a mark: a code span, or a list's bracket, slash or pipe.
 * `retired-copy` holds every retired WORD a reader meets, and it finds those
 * by a curated list of copy. Between the two there is a gap the width of an
 * ordinary sentence, and `unhappy` sat in it for two releases after
 * `21000116000000` folded it onto `variant`.
 *
 * ── THE THREE SHAPES THAT SURVIVED, AND WHICH ARE REACHED HERE ─────────────
 *
 * PROSE WITHOUT BACKTICKS, in a document an agent is instructed by. "Dead
 * ends: exception/unhappy paths that never resolve or rejoin" is a review
 * lens in `agents/`, and a retired value in an agent's instructions is a
 * value the agent may try to write and the CHECK constraint will refuse. The
 * markdown sweep reads code spans, so it had nothing to key on. REACHED — it
 * is the first subject below.
 *
 * A FIGURE. `docs/assets/` is authored SVG; `sync-cover-assets` copies it to
 * the cover page, so a reader meets it inside the app. No vocabulary sweep
 * opened an SVG for values at all — `retired-copy` reads these files, but for
 * retired COPY, and a path kind is not copy. REACHED — the second subject.
 *
 * A COMMENT INSIDE A `.tsx`. NOT REACHED, on evidence rather than on effort,
 * and the paragraph below is that evidence.
 *
 * ── WHY THE THIRD SHAPE IS NOT SWEPT ───────────────────────────────────────
 *
 * `retired-copy`'s header already says comments are nobody's subject, and for
 * values the reason is stronger than "we chose not to": under `src/` the
 * retired words are LIVE. `pathKindTheme.ts` matches `'unhappy path'` and
 * `'alternative path'` against the name an author types, because the fold took
 * the KIND and left the names alone. That is correct, current code.
 *
 * Measured: the company rule below over every comment under `src/` returns
 * ten sentences, of which two are defects. The other eight are the app
 * explaining what it translates — a schema-version note, a migration
 * paragraph, "a single source of truth … the stacked column headers" — and
 * `isCorrection` cannot excuse them, because a comment beside code says what
 * changed without citing the migration that changed it. Eight exemptions on
 * the first run is a list of sites, which is the shape this repository
 * rejects. The two defects were fixed by hand and this file does not pretend
 * to hold the third shape.
 *
 * ── THE ASSERTION ──────────────────────────────────────────────────────────
 *
 * `retiredValuesInCompany()` is the rule and its header carries the reasoning:
 * a retired value counts when the unit names the table it was retired from AND
 * carries a value that column still accepts. Nothing in this file counts
 * anything, names a site, or knows which value is at issue — the rename map is
 * asked what is retired and the schema dump what is live, so the value folded
 * next month is swept next month and this file does not change.
 *
 * ── WHAT THIS CANNOT SEE ───────────────────────────────────────────────────
 *
 * The rule's own header states its blind spots — anaphora across a sentence
 * boundary, and a sentence using a retired value as English beside its own
 * table. Two more belong to this file's subjects. The decision records are
 * outside `sweptDocs` and stay outside, on the reason that module gives:
 * rewriting a decision record falsifies it. And a figure that says nothing but
 * the value — a box labelled `unhappy` with no `Path` beside it and no live
 * kind anywhere in the drawing — has no company to keep, so this passes it. Such a figure would be unreadable for other reasons,
 * which is the whole of why the risk is taken.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SCHEMA } from '../check-instance-vocabulary.mjs'
import { sweptDocs } from '../swept-docs.mjs'
import { catalogFromSchema, isCorrection, retiredValuesInCompany, sentencesOf } from '../value-set-claims.mjs'

const ROOT = process.cwd()
const FIGURES = resolve(ROOT, 'docs/assets')

const catalog = () => catalogFromSchema(readFileSync(SCHEMA, 'utf8'))

const say = (where, { value, column, is, migration }) =>
  `${where} offers \`${value}\` beside the values \`${column}\` accepts; ` +
  `\`${is}\` replaced it in ${migration ?? 'the rename map'}`

/* ------------------------------------------------- subject one: the prose */

test('no swept document offers a retired value in the company of its column', () => {
  const live = catalog()
  const docs = sweptDocs(ROOT)
  // Same breadth assertion the figures half of this file already makes: the
  // root documents are prepended unconditionally, so a corpus that collapsed
  // to them alone still has a length and still sweeps green.
  assert.ok(docs.length > 20, `only ${docs.length} swept document(s) — is the sweep still on?`)
  const found = []
  for (const relative of docs) {
    for (const sentence of sentencesOf(readFileSync(`${ROOT}/${relative}`, 'utf8'))) {
      // A sentence recording the retirement has to spell the retired value,
      // and proves it is doing that the way the markdown sweep asks: a
      // correction verb and the migration that ran.
      if (isCorrection(sentence.text)) continue
      for (const hit of retiredValuesInCompany(sentence.text, live)) {
        found.push(say(`${relative}:${sentence.line}`, hit))
      }
    }
  }
  assert.deepEqual(
    found,
    [],
    'A document teaches a value the database refuses, without a backtick for ' +
      'the value sweep to key on. These trees are what an agent is instructed ' +
      'by, so the value is one it may try to write:\n' +
      found.join('\n'),
  )
})

/* ----------------------------------------------- subject two: the figures */

/** `<text>` content, `<tspan>` markup flattened away. */
const SVG_TEXT = /<text\b[^>]*>([\s\S]*?)<\/text>/g

/**
 * A figure as ONE unit of text.
 *
 * A drawing has no sentences. `Path · happy`, `Path · exception` and
 * `Path · unhappy` are one enumeration in three `<text>` nodes, because they
 * label three boxes stacked behind one another — a per-node unit would read
 * each as a lone word and find no company at all. `<text>` only: not `id`,
 * not `class`, not an SVG comment, which is the subject `retired-copy` settled
 * for the same files.
 */
export function figureText(code) {
  return [...code.matchAll(SVG_TEXT)]
    .map((match) => match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((value) => value !== '')
    .join(' · ')
}

function figures() {
  return readdirSync(FIGURES)
    .filter((name) => name.endsWith('.svg'))
    .sort()
    .map((name) => ({
      file: `docs/assets/${name}`,
      text: figureText(readFileSync(resolve(FIGURES, name), 'utf8')),
    }))
}

test('no authored figure offers a retired value in the company of its column', () => {
  const live = catalog()
  const found = figures().flatMap(({ file, text }) =>
    retiredValuesInCompany(text, live).map((hit) => say(file, hit)),
  )
  assert.deepEqual(
    found,
    [],
    'A figure draws a value the database refuses. These render in the app ' +
      'through the cover page, not only in a README, and every instance built ' +
      `from this template inherits them:\n${found.join('\n')}`,
  )
})

test('the figure reader found figures, and read text out of them', () => {
  // A reader that found nothing passes the assertion above in silence, which
  // is the failure mode a guard over a directory is always one typo from.
  const all = figures()
  assert.ok(all.length > 0, 'no figure was read out of docs/assets')
  assert.ok(
    all.every(({ text }) => /[A-Za-z]/.test(text)),
    'a figure parsed to no text at all',
  )
})

test('the figure reader takes the text nodes and nothing else', () => {
  const code = [
    '<text x="10" y="20" class="titleDim">Path &#183; happy</text>',
    '<text x="10" y="40">a wrapped',
    '  label</text>',
    '<text x="10" y="60"><tspan>one</tspan> <tspan>step</tspan></text>',
    '<rect id="path-unhappy" class="unhappy" data-note="unhappy"/>',
    '<!-- unhappy in a comment is not drawn -->',
  ].join('\n')
  assert.equal(figureText(code), 'Path &#183; happy · a wrapped label · one step')
})

/* --------------------------------------------------------- the rule itself */

test('the rule reads a retired value that keeps its column company', () => {
  const live = catalog()
  const hits = (unit) => retiredValuesInCompany(unit, live).map((one) => `${one.value}->${one.is}`)

  // The three shapes the defect took. The table names the column in the first
  // two; the third has both signals across the drawing.
  assert.deepEqual(hits('Dead ends: exception/unhappy paths that never resolve.'), ['unhappy->variant'])
  assert.deepEqual(hits("the scenario's few paths (happy / unhappy / exception)"), ['unhappy->variant'])
  assert.deepEqual(hits('Path · exception · Path · unhappy · Path · happy'), ['unhappy->variant'])
})

test('the rule needs both signals, and each alone is ordinary English', () => {
  const live = catalog()
  const hits = (unit) => retiredValuesInCompany(unit, live).map((one) => one.value)

  // NAMED but not BESIDE: the table is there and no live value of it is.
  assert.deepEqual(hits('Inside a single path'), [])
  assert.deepEqual(hits('the cell_dependencies rows a trigger validates'), [])
  assert.deepEqual(hits('two paths line up, which is what makes side-by-side comparison mean anything'), [])
  // BESIDE but not NAMED: a live value is there and its table is not.
  assert.deepEqual(hits('whatever the question needs, once enables points upstream'), [])
  assert.deepEqual(hits('a single source of truth for the stacked column headers'), [])
  // Neither.
  assert.deepEqual(hits('the customer is unhappy and says so'), [])
})

test('the rule is scoped to the value own column, not to any column', () => {
  const live = catalog()
  // `single` retired from `scenarios.layout`. A sentence naming `paths` and a
  // live path kind is company for `paths.kind` and none at all for a layout.
  assert.deepEqual(retiredValuesInCompany('a single happy path in this scenario', live), [])
})

test('the rule asks the map what is retired, and the schema what is live', () => {
  // The whole of what it knows comes from those two, so a fold landing next
  // month is swept next month. Asserted by giving it a different catalog: the
  // same sentence is a finding under one and silent under the other.
  const pretend = catalogFromSchema(
    "CREATE TABLE public.paths (\n    kind text NOT NULL,\n    CONSTRAINT paths_kind_check CHECK ((kind = ANY (ARRAY['happy'::text, 'unhappy'::text])))\n);",
  )
  assert.deepEqual(retiredValuesInCompany('happy or unhappy paths', pretend), [])
  assert.deepEqual(
    retiredValuesInCompany('happy or unhappy paths', catalog()).map((one) => one.value),
    ['unhappy'],
  )
})
