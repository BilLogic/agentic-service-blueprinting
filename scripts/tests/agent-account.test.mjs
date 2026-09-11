/**
 * The agent account's renderers and ratchet, on fixtures and on the real
 * sources. `check:agent-account` needs the database; what it renders and
 * what it holds are decided here without one.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  coverage,
  entityKinds,
  evaluate,
  handWritten,
  prohibitionCount,
  ratchetFailures,
  renderSchema,
  renderVocabulary,
  splice,
  tableColumns,
} from '../agent-account.mjs'
import { credentials } from '../generate-agent-account.mjs'

const ROOT = new URL('../..', import.meta.url).pathname

test('the six entity kinds are read off panelTerms.ts as written', () => {
  const kinds = entityKinds(readFileSync(`${ROOT}src/lib/panelTerms.ts`, 'utf8'))
  assert.deepEqual(
    kinds.map((k) => k.kind),
    ['service', 'phase', 'scenario', 'path', 'step', 'lane'],
  )
  assert.equal(kinds[0].label, 'Service')
  assert.match(kinds[5].definition, /^A row of the board/)
})

test('every relation with a Row type is a column inventory', () => {
  const columns = tableColumns(readFileSync(`${ROOT}src/types/database.ts`, 'utf8'))
  assert.ok(columns.get('paths').includes('kind'))
  assert.ok(columns.get('evidence_counts'), 'views carry a Row too')
  assert.equal(columns.has('search_blueprint'), false, 'a function has no Row')
})

test('the vocabulary is one line per kind, definition verbatim', () => {
  const out = renderVocabulary([{ kind: 'lane', label: 'Lane', definition: 'One row of the board.' }])
  assert.equal(out, '**Lane** — One row of the board.')
})

const columns = new Map([
  ['paths', ['id', 'kind', 'status']],
  ['evidence', ['id', 'note']],
])
const comments = [
  { relation: 'paths', column_name: null, comment: 'One route through a scenario.' },
  { relation: 'paths', column_name: 'kind', comment: 'happy | variant | exception' },
  { relation: 'evidence', column_name: null, comment: 'Provenance rows.' },
]
const readable = new Set(['paths'])

test('the schema section lays comments over the inventory and keeps sealed relations visible', () => {
  const out = renderSchema({ columns, comments, readable })
  assert.match(out, /### `paths`\nOne route through a scenario\.\n\n1 of 3 columns described\./)
  assert.match(out, /\| `kind` \| happy \\\| variant \\\| exception \|/, 'a pipe in a comment is escaped in a cell')
  assert.match(out, /\| `status` \| — \|/, 'an undescribed column is a visible gap')
  assert.match(out, /### Not readable with the anon key[\s\S]*- `evidence` — Provenance rows\./)
})

test('coverage counts only relations an agent can read', () => {
  assert.deepEqual(coverage({ columns, comments, readable }), { described: 1, of: 3 })
})

test('a generated section is replaced between its markers and nothing else moves', () => {
  const doc = 'before\n\n<!-- generated:x from y -->\n\nold\n\n<!-- /generated:x -->\n\nafter\n'
  assert.equal(splice(doc, 'x', 'new'), 'before\n\n<!-- generated:x from y -->\n\nnew\n\n<!-- /generated:x -->\n\nafter\n')
  assert.throws(() => splice('no markers', 'x', 'new'), /no <!-- generated:x -->/)
})

test('the hand-written core excludes frontmatter and generated sections, and its prohibitions are counted', () => {
  const doc = '---\nsummary: never mind\n---\n\nDo this. <!-- generated:x -->\nnever that\n<!-- /generated:x -->\nDo not skip; the staff they do not see may never notice.'
  assert.equal(handWritten(doc).trim(), 'Do this. \nDo not skip; the staff they do not see may never notice.')
  // An instruction at the head of a sentence, not a description inside one.
  assert.equal(prohibitionCount(handWritten(doc)), 1)
})

test('the ratchet: coverage may only rise, prohibitions may only fall, and an unrecorded gain is stale', () => {
  const baseline = { columnComments: { described: 40, of: 100 }, prohibitions: 2 }
  assert.deepEqual(ratchetFailures({ columnComments: { described: 40, of: 100 }, prohibitions: 2 }, baseline), [])
  assert.match(ratchetFailures({ columnComments: { described: 40, of: 101 }, prohibitions: 2 }, baseline)[0], /coverage fell/)
  assert.match(ratchetFailures({ columnComments: { described: 40, of: 100 }, prohibitions: 3 }, baseline)[0], /3 prohibition/)
  assert.match(ratchetFailures({ columnComments: { described: 41, of: 100 }, prohibitions: 2 }, baseline)[0], /stale/)
  assert.match(ratchetFailures({ columnComments: { described: 40, of: 100 }, prohibitions: 1 }, baseline)[0], /stale/)
})

const MARKED = `---
summary: a fixture
---

hand.

<!-- generated:vocabulary from panelTerms.ts -->

old vocab

<!-- /generated:vocabulary -->

<!-- generated:schema from the catalog -->

old schema

<!-- /generated:schema -->
`

test('the check fails when the account is stale or column-comment coverage falls', () => {
  const kinds = [{ kind: 'lane', label: 'Lane', definition: 'One row of the board.' }]
  const sources = { columns, comments, readable }
  const matching = evaluate({
    doc: MARKED,
    kinds,
    sources,
    baseline: { columnComments: { described: 1, of: 3 }, prohibitions: 0 },
    check: false,
  })
  const held = evaluate({
    doc: matching.next,
    kinds,
    sources,
    baseline: { columnComments: { described: 1, of: 3 }, prohibitions: 0 },
    check: true,
  })
  assert.deepEqual(held.failures, [])

  const stale = evaluate({
    doc: MARKED,
    kinds,
    sources,
    baseline: { columnComments: { described: 1, of: 3 }, prohibitions: 0 },
    check: true,
  })
  assert.match(stale.failures[0], /is not what its sources render/)

  const fell = evaluate({
    doc: matching.next,
    kinds,
    sources,
    baseline: { columnComments: { described: 1, of: 2 }, prohibitions: 0 },
    check: true,
  })
  assert.match(fell.failures[0], /coverage fell/)
})

test('recording the baseline is not judged against the baseline it replaces', () => {
  const kinds = [{ kind: 'lane', label: 'Lane', definition: 'One row of the board.' }]
  const sources = { columns, comments, readable }
  const first = evaluate({ doc: MARKED, kinds, sources, baseline: null, check: false, record: true })
  assert.deepEqual(first.failures, [], 'the first record writes the baseline the missing-file failure asks for')

  const gained = { columnComments: { described: 0, of: 3 }, prohibitions: 0 }
  const rerecord = evaluate({ doc: MARKED, kinds, sources, baseline: gained, check: false, record: true })
  assert.deepEqual(rerecord.failures, [], 'a re-record after a gain is the fix the stale failure names')

  const unrecorded = evaluate({ doc: MARKED, kinds, sources, baseline: gained, check: false })
  assert.match(unrecorded.failures[0], /stale/)
  const missing = evaluate({ doc: MARKED, kinds, sources, baseline: null, check: false })
  assert.match(missing.failures[0], /does not exist/)
})

test('with no database configured, nothing is generated', () => {
  assert.equal(credentials({}), null)
  assert.equal(
    credentials({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: 'your-anon-key' }),
    null,
  )
  assert.deepEqual(
    credentials({
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321/',
      VITE_SUPABASE_ANON_KEY: 'sb_anon_test_key',
    }),
    { url: 'http://127.0.0.1:54321', key: 'sb_anon_test_key' },
  )
})

test('the committed core has no prohibitions', () => {
  const doc = readFileSync(`${ROOT}docs/agents/blueprint.md`, 'utf8')
  assert.equal(prohibitionCount(handWritten(doc)), 0)
})
