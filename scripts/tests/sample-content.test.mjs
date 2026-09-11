#!/usr/bin/env node
/**
 * The template's own content, checked from the side an adopter stands on.
 *
 * The two sibling suites hold guards that must reach zero in this repository
 * and stay there. This one holds the opposite pair, and the pair is the whole
 * point: in a FRESH CLONE the report is full, because the sample really is
 * what the app serves, and on a deployment that has put its own content in it
 * is empty. A check that could not tell those two apart would be a check that
 * reported the domain this template is for.
 *
 * The adopted half is a fabricated tree rather than a sibling checkout, so
 * the claim is held on every machine rather than only on one that happens to
 * have a deployment beside it.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  EXAMPLES,
  MARKERS,
  SAMPLE_SCENARIO_TITLES,
  contentFiles,
  findings,
  groupSites,
  isScanned,
  sitesIn,
} from '../check-sample-content.mjs'

const SCRIPT = fileURLToPath(new URL('../check-sample-content.mjs', import.meta.url))
const REPO_ROOT = resolve(dirname(SCRIPT), '..')

const labels = (source) => sitesIn(source).map((site) => site.label)
const matches = (source) => sitesIn(source).map((site) => site.match)

/** A tree with `files` written into it, as a temp root the check can read. */
function tree(files) {
  const root = mkdtempSync(join(tmpdir(), 'sample-content-'))
  for (const [path, body] of Object.entries(files)) {
    const file = join(root, path)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, body, 'utf8')
  }
  return root
}

/** What `scripts/generate_fallbacks.py --register` leaves behind, in miniature. */
const ADOPTED = {
  'supabase/config.toml': '[db.seed]\nenabled = true\nsql_paths = ["./seed.sql"]\n',
  'supabase/seed.sql': [
    "insert into public.services (id, name, slug) values",
    "  ('a1c4f2e8-7b03-4d19-9e55-2f8ab6c04d71', 'Onboarding a new supplier',",
    "   'onboarding-a-new-supplier');",
    "insert into public.phases (id, service_id, name, position) values",
    "  ('b7d0e5a2-3c46-4f8b-8a11-90ce7d2f4b63',",
    "   'a1c4f2e8-7b03-4d19-9e55-2f8ab6c04d71', 'Discover', 1);",
  ].join('\n'),
  'src/data/blueprintFallbacks.ts':
    "// GENERATED-BLUEPRINT-REGISTRY:BEGIN — managed by scripts/generate_fallbacks.py --register.\n" +
    "import { GENERATED_PATH_FALLBACKS_BY_SCENARIO } from '@/data/supplierBlueprint'\n" +
    '// GENERATED-BLUEPRINT-REGISTRY:END\n',
  'src/data/supplierBlueprint.ts':
    "export const SERVICE_ID = 'a1c4f2e8-7b03-4d19-9e55-2f8ab6c04d71'\n" +
    "export const SCENARIOS = [{ name: 'Qualify the supplier' }]\n",
}

/* ---------------------------------------------------------- a fresh clone */

test('a fresh clone reports the sample, because the sample is what it serves', () => {
  const sites = findings()
  assert.ok(sites.length > 0, 'the shipped tree reports nothing — the markers have rotted')

  // All three markers land, and both halves of the content surface do. If a
  // marker stops matching here it has been renamed out from under the check,
  // which is the way an advisory guard dies quietly.
  const found = new Set(sites.map((site) => site.label))
  for (const marker of MARKERS) {
    assert.ok(found.has(marker.label), `${marker.label} matches nothing in the shipped tree`)
  }
  const files = new Set(sites.map((site) => site.path))
  assert.ok(files.has('supabase/seed.sql'), 'the seed is not being read')
  assert.ok(files.has('src/data/sampleBlueprint.ts'), 'the offline board is not being read')
})

test('the report names the file, the line and the value', () => {
  const site = findings().find((hit) => hit.path === 'supabase/seed.sql')
  assert.ok(Number.isInteger(site.line) && site.line > 0)
  assert.ok(site.match.length > 0)
  assert.ok(site.text.length > 0)
  assert.ok(site.why.length > 40)
})

/* ------------------------------------------------------ an adopted deployment */

test('a deployment that put its own content in reports nothing', () => {
  assert.deepEqual(findings(tree(ADOPTED)), [])
})

test('the seed swept is the one [db.seed] names, not the one this repo happens to use', () => {
  const root = tree({
    ...ADOPTED,
    'supabase/config.toml': '[db.seed]\nenabled = true\nsql_paths = ["./seeds/blueprint.sql"]\n',
    'supabase/seed.sql': '-- left behind by the template, and no longer loaded\n',
    'supabase/seeds/blueprint.sql':
      "insert into public.services (name) values ('Keeping a blueprint true');",
  })
  assert.deepEqual(
    findings(root).map((site) => `${site.path}:${site.line} — ${site.match}`),
    ['supabase/seeds/blueprint.sql:1 — Keeping a blueprint true'],
  )
})

/* ------------------------------------------------------------- the markers */

test('the sample service is caught, name and slug', () => {
  assert.deepEqual(matches("name: 'Keeping a blueprint true',"), ['Keeping a blueprint true'])
  assert.deepEqual(matches("slug: 'keeping-a-blueprint-true',"), ['keeping-a-blueprint-true'])
})

test('an id out of the sample database is caught with no name anywhere near it', () => {
  // The marker with the name filed off: thirty-two hex digits that say
  // nothing, on a line whose prose is entirely the adopter's own.
  const found = sitesIn(
    'const cells = [\n  { id: "f0000000-0000-4000-8000-110300010001", content: "Signs the contract" },\n]\n',
  )
  assert.deepEqual(
    found.map(({ line, label, match }) => ({ line, label, match })),
    [
      {
        line: 2,
        label: 'the sample’s own id namespace',
        match: 'f0000000-0000-4000-8000-110300010001',
      },
    ],
  )
})

test('a deployment’s own ids pass — the namespace is the marker, not the shape', () => {
  assert.deepEqual(labels('a0000000-0000-4000-8000-000000040103'), [])
  assert.deepEqual(labels('ae874da3-865c-a06c-f55e-e9085920b694'), [])
  assert.deepEqual(labels('11111111-1111-4111-8111-111111111111'), [])
})

test('the sample’s scenario titles are caught, each of the six', () => {
  for (const title of SAMPLE_SCENARIO_TITLES) {
    assert.deepEqual(matches(`  name: '${title}',`), [title], `${title} is not matched`)
  }
})

/* ------------------------------------- what an adopter may legitimately write */

test('the phase names pass — matching them would report a deployment for having phases', () => {
  assert.deepEqual(labels("{ name: 'Discover', position: 1 },"), [])
  assert.deepEqual(labels("{ name: 'Setup', position: 2 },"), [])
  assert.deepEqual(labels("{ name: 'Operate', position: 3 },"), [])
  assert.deepEqual(labels("{ name: 'Maintain', position: 4 },"), [])
})

test('the lane actors pass — an adopter who writes them has taken the template’s advice', () => {
  assert.deepEqual(labels("{ name: 'Blueprint owner', role: 'customer_actions' },"), [])
  assert.deepEqual(labels("{ name: 'Stakeholders', role: null },"), [])
})

test('the path names pass — they are ordinary English describing an ordinary branch', () => {
  assert.deepEqual(labels("{ name: 'A first look', kind: 'happy' },"), [])
  assert.deepEqual(labels("{ name: 'From your documents', kind: 'happy' },"), [])
  assert.deepEqual(labels("{ name: 'Findings triaged', kind: 'happy' },"), [])
})

/* -------------------------------------------------------------- the subject */

test('the subject is the content a deployment serves, and nothing else', () => {
  // Every one of these NAMES the sample and always will. A sweep that
  // reported them could not reach zero on any deployment, ever.
  const files = contentFiles()
  assert.ok(files.includes('supabase/seed.sql'))
  assert.ok(files.includes('src/data/sampleBlueprint.ts'))
  assert.ok(!files.includes('scripts/generate_sample_blueprint.mjs'))
  assert.ok(!files.includes('docs/connectors/supabase/database.md'))
  assert.ok(!files.includes('README.md'))
  assert.ok(!files.includes('SETUP.md'))
})

test('a fixture is out of subject, and so is a binary', () => {
  assert.equal(isScanned('src/data/sampleBlueprint.ts'), true)
  assert.equal(isScanned('src/data/sampleBlueprint.test.ts'), false)
  assert.equal(isScanned('src/data/tests/fixture.ts'), false)
  assert.equal(isScanned('src/data/example-logo.png'), false)
})

/* --------------------------------------------------------------- the report */

test('sites fold to one group per marker and file, strongest marker first', () => {
  const sites = [
    { path: 'src/data/b.ts', label: MARKERS[2].label, why: MARKERS[2].why, line: 9, match: 'x' },
    { path: 'supabase/seed.sql', label: MARKERS[0].label, why: MARKERS[0].why, line: 1, match: 'y' },
    { path: 'supabase/seed.sql', label: MARKERS[0].label, why: MARKERS[0].why, line: 4, match: 'z' },
  ]
  const groups = groupSites(sites, ['supabase/seed.sql', 'src/data/b.ts'])
  assert.deepEqual(
    groups.map(({ label, path, sites: found }) => `${label} · ${path} · ${found.length}`),
    [`${MARKERS[0].label} · supabase/seed.sql · 2`, `${MARKERS[2].label} · src/data/b.ts · 1`],
  )
})

test('every marker says why it exists, because the report prints it', () => {
  for (const marker of MARKERS) {
    assert.ok(marker.label, 'a marker with no label reports nothing readable')
    assert.ok(marker.why && marker.why.length > 40, `${marker.label} states no why`)
    assert.ok(marker.find.global, `${marker.label} is not global — matchAll would throw`)
  }
  assert.ok(EXAMPLES > 0, 'a group that names no site sends nobody anywhere')
})

/* ------------------------------------------------------------- advisory */

test('it exits 0 on the tree that is full of sample content, and says so', () => {
  // The claim the whole check rests on. Run as a process, because an exit
  // code is the thing being asserted and only a process has one.
  const out = execFileSync(process.execPath, [SCRIPT], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
  assert.match(out, /exits 0 on purpose/)
  assert.match(out, /Nothing here is failing/)
  assert.match(out, /supabase\/seed\.sql:\d+ — /)
})
