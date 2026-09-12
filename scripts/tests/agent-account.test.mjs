/**
 * The agent account's renderers and ratchet, on fixtures and on the real
 * sources. `check:agent-account` needs the database; what it renders and
 * what it holds are decided here without one.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  classifyRelation,
  coverage,
  entityKinds,
  evaluate,
  handWritten,
  prohibitionCount,
  ratchetFailures,
  reconcile,
  renderSchema,
  renderVocabulary,
  schemaDeclaration,
  splice,
  tableColumns,
  vocabularySource,
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

/* ------------------------------------------ where each source comes from */

test('the vocabulary follows the application, into the package when this tree has no src', () => {
  const vendored = vocabularySource('/repo', (p) => p === '/repo/src/lib/panelTerms.ts')
  assert.deepEqual(vendored, { path: '/repo/src/lib/panelTerms.ts', owner: 'repository' })

  const imported = vocabularySource('/repo', (p) => p.includes('node_modules'))
  assert.equal(imported.owner, 'package')
  assert.match(imported.path, /node_modules\/agentic-service-blueprinting\/src\/lib\/panelTerms\.ts$/)
})

test('the schema declaration is the deployment root first, and the package only as a default', () => {
  const own = schemaDeclaration('/repo', () => true)
  assert.deepEqual(own, { path: '/repo/deployment/types/database.ts', owner: 'deployment' })

  const vendored = schemaDeclaration('/repo', (p) => p === '/repo/src/types/database.ts')
  assert.equal(vendored.owner, 'repository')

  const fallback = schemaDeclaration('/repo', () => false)
  assert.equal(fallback.owner, 'package')
  assert.match(fallback.path, /node_modules\/agentic-service-blueprinting\/src\/types\/database\.ts$/)
})

/* ------------------------------------------ the database has the last word */

test('a relation is readable, sealed or simply not in this database', () => {
  assert.equal(classifyRelation({ status: 200, body: [] }), 'readable')
  assert.equal(classifyRelation({ status: 404, body: { code: 'PGRST205' } }), 'absent')
  assert.equal(classifyRelation({ status: 401, body: { code: '42501' } }), 'sealed')
  assert.equal(classifyRelation({ status: 403, body: { code: '42501' } }), 'sealed')
  assert.equal(classifyRelation({ status: 500, body: 'gateway' }), 'unknown')
})

// The measured case: a package declaration against a deployment's own
// database. The declaration names two relations this database does not have
// and one column it renamed; the database has three columns the declaration
// never heard of.
const DECLARED = new Map([
  ['cells', ['id', 'content']],
  ['stakeholders', ['id', 'name', 'part_of_id']],
  ['business_models', ['id', 'name']],
  ['schema_version', ['version']],
  ['service_account_emails', ['email']],
])
const PROBED = new Map([
  ['cells', { status: 'readable', columns: ['id', 'content', 'search_tsv'], order: 'table' }],
  ['stakeholders', { status: 'readable', columns: ['id', 'name', 'parent_id'], order: 'table' }],
  ['business_models', { status: 'sealed' }],
  ['schema_version', { status: 'absent' }],
  ['service_account_emails', { status: 'absent' }],
])
const LIVE_COMMENTS = [
  { relation: 'cells', column_name: null, comment: 'One moment on the board.' },
  { relation: 'cells', column_name: 'content', comment: 'The sentence of record.' },
  { relation: 'cells', column_name: 'origin', comment: 'Where the row came from.' },
  { relation: 'stakeholders', column_name: null, comment: 'Actors.' },
  { relation: 'business_models', column_name: null, comment: 'Commercial framing.' },
]

test('the account names only what this database confirmed, whatever the declaration says', () => {
  const { columns, readable, notes } = reconcile({
    declared: DECLARED,
    probed: PROBED,
    comments: LIVE_COMMENTS,
  })

  assert.equal(columns.has('schema_version'), false, 'a declared relation this database lacks is dropped')
  assert.equal(columns.has('service_account_emails'), false)
  assert.deepEqual(columns.get('cells'), ['id', 'content', 'search_tsv', 'origin'])
  assert.deepEqual(columns.get('stakeholders'), ['id', 'name', 'parent_id'], 'the renamed column goes')
  assert.deepEqual(columns.get('business_models'), [], 'a sealed relation keeps its name and no columns')
  assert.deepEqual([...readable], ['cells', 'stakeholders'])

  assert.ok(notes.some((n) => /schema_version/.test(n) && /service_account_emails/.test(n)))
  assert.ok(notes.some((n) => /stakeholders\.part_of_id/.test(n)))
  assert.ok(notes.some((n) => /cells\.search_tsv/.test(n)))
})

test('a relation that gave no row renders in one order, whoever asked the questions', () => {
  const asked = (columns) =>
    reconcile({
      declared: new Map([['slide_images', columns]]),
      probed: new Map([['slide_images', { status: 'readable', columns }]]),
      comments: [{ relation: 'slide_images', column_name: 'position', comment: 'The order.' }],
    }).columns.get('slide_images')

  assert.deepEqual(asked(['id', 'slide_id', 'position']), ['id', 'position', 'slide_id'])
  assert.deepEqual(asked(['position', 'id', 'slide_id']), ['id', 'position', 'slide_id'])
})

test('a deployment whose schema differs holds a true account and passes its own check', () => {
  const kinds = [{ kind: 'lane', label: 'Lane', definition: 'One row of the board.' }]
  const sources = reconcile({ declared: DECLARED, probed: PROBED, comments: LIVE_COMMENTS })
  const live = { ...sources, comments: LIVE_COMMENTS }

  const rendered = evaluate({ doc: MARKED, kinds, sources: live, baseline: null, check: false, record: true }).next
  assert.match(rendered, /### `cells`[\s\S]*\| `search_tsv` \| — \|/)
  assert.doesNotMatch(rendered, /`schema_version`/)
  assert.doesNotMatch(rendered, /`part_of_id`/)
  assert.match(rendered, /### Not readable with the anon key[\s\S]*- `business_models` — Commercial framing\./)

  const baseline = { columnComments: coverage(live), prohibitions: prohibitionCount(handWritten(rendered)) }
  const held = evaluate({ doc: rendered, kinds, sources: live, baseline, check: true })
  assert.deepEqual(held.failures, [], 'a true account of a differing schema is green')
})

test('an account that has gone stale against its own database fails', () => {
  const kinds = [{ kind: 'lane', label: 'Lane', definition: 'One row of the board.' }]
  const before = reconcile({ declared: DECLARED, probed: PROBED, comments: LIVE_COMMENTS })
  const beforeSources = { ...before, comments: LIVE_COMMENTS }
  const rendered = evaluate({ doc: MARKED, kinds, sources: beforeSources, baseline: null, check: false, record: true }).next
  const baseline = {
    columnComments: coverage(beforeSources),
    prohibitions: prohibitionCount(handWritten(rendered)),
  }

  // The deployment's own migration adds a column. The document does not move.
  const after = reconcile({
    declared: DECLARED,
    probed: new Map([
      ...PROBED,
      ['cells', { status: 'readable', columns: ['id', 'content', 'search_tsv', 'status'], order: 'table' }],
    ]),
    comments: LIVE_COMMENTS,
  })
  const stale = evaluate({
    doc: rendered,
    kinds,
    sources: { ...after, comments: LIVE_COMMENTS },
    baseline,
    check: true,
  })
  assert.match(stale.failures[0], /is not what its sources render/)
  assert.match(stale.failures[0], /toward the database/)
})
