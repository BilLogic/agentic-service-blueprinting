#!/usr/bin/env node
/**
 * The inventory check, on fixtures: what a psql row means, what the types' tail
 * says, and which direction a disagreement is reported in.
 *
 * The end-to-end half of this check needs a built database and runs in CI's
 * `portable-core` job, which is the only place both halves exist. What can be
 * wrong without one is the reading: a row shape misparsed files a vocabulary
 * member as a table column, and a tail parser that matches nothing reports a
 * clean schema over four unions it never read. Both look exactly like a pass.
 *
 * These three tests used to live in `portable-partition.test.mjs`, which is
 * about the `-- @core` / `-- @recipe` partition and had them as lodgers. They
 * are here with the enum cases beside them rather than in two places.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { sweep } from '../sweep.mjs'
import {
  compare,
  declaredVocabularies,
  parseEnumUnions,
  parseGeneratedTypes,
  parseInventory,
} from '../check-schema-inventory.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const app = sweep({ subject: 'app', root: ROOT })

/** An application file, wherever it sits; its absence is this test's subject gone. */
const readApp = (path) => {
  const text = app.read(path)
  assert.ok(text !== null, `no ${path} under ${app.base}: this test has no subject`)
  return text
}

/** A tail of the shape the generator writes, with the aliases under it. */
const TAIL = `/** The kinds of Path a Scenario holds. */
export type PathKind =
  | 'happy'
  | 'variant'

/** Who a Stakeholder is to the service. */
export type StakeholderKind =
  | 'recipient'

export type Cell = Database['public']['Tables']['cells']['Row']
export type Slide = Database['public']['Tables']['slides']['Row'] & {
  slide_images?: SlideImage[]
}
`

/** The two halves of the types side, as `main` assembles them. */
const declared = (tables, source) => ({
  tables,
  enums: declaredVocabularies(parseEnumUnions(source)),
})

test('the inventory reads psql tab output, files enum rows apart from columns, and ignores blank lines', () => {
  const { tables, enums } = parseInventory(
    [
      'column\tcells\tid',
      'column\tcells\tcontent',
      '',
      'column\tphases\tid',
      'enum\tentity_status\tlive',
      'enum\tentity_status\tproposed',
      'enum\tpaths.kind\thappy',
      '',
    ].join('\n'),
  )
  assert.deepEqual([...tables.get('cells')].sort(), ['content', 'id'])
  assert.deepEqual([...tables.get('phases')], ['id'])
  assert.ok(!tables.has('entity_status'), 'a domain is not a table')
  assert.deepEqual([...enums.get('entity_status')].sort(), ['live', 'proposed'])
  assert.deepEqual([...enums.get('paths.kind')], ['happy'])
})

test('a union written on one line is the same union as one written one member per line', () => {
  // The Supabase CLI's tail, which a deployment's file may still carry, writes
  // `= 'a' | 'b'`; the generator writes a member per line. The superset check
  // reads a deployment's file with this parser, so both spellings are one.
  const oneLine = [
    "export type PathKind = 'happy' | 'variant' | 'exception'",
    '/** Not a vocabulary. */',
    "export type Slide = Database['public']['Tables']['slides']['Row'] & {",
    '  slide_images?: SlideImage[]',
    '}',
    "export type EntityStatus =\n  | 'proposed'\n  | 'live'",
    '',
  ].join('\n')
  const unions = parseEnumUnions(oneLine)
  assert.deepEqual(unions.get('PathKind'), ['happy', 'variant', 'exception'])
  assert.deepEqual(unions.get('EntityStatus'), ['proposed', 'live'])
  assert.ok(!unions.has('Slide'))
})

test('a row of a kind this check does not read fails rather than being filed as a table', () => {
  assert.throws(
    () => parseInventory('column\tcells\tid\nindex\tcells\tcells_pkey\n'),
    /kind index/,
  )
})

test('the unions in the tail are read member for member, and the row aliases are not unions', () => {
  const unions = parseEnumUnions(TAIL)
  assert.deepEqual([...unions.keys()], ['PathKind', 'StakeholderKind'])
  assert.deepEqual(unions.get('PathKind'), ['happy', 'variant'])
  assert.deepEqual(unions.get('StakeholderKind'), ['recipient'])
})

test('each union is keyed by the domain or column it closes, the way the generator derived it', () => {
  const bySubject = declaredVocabularies(parseEnumUnions(TAIL))
  assert.deepEqual([...bySubject.keys()], ['paths.kind', 'stakeholders.kind'])
  assert.equal(bySubject.get('paths.kind').name, 'PathKind')
})

test('drift is reported in the direction that tells you what to do', () => {
  const types = declared(new Map([['cells', new Set(['id', 'ghost'])]]), TAIL)
  const actual = parseInventory(
    [
      'column\tcells\tid',
      'column\tcells\tcontent',
      'column\tagent_sessions\tid',
      'enum\tpaths.kind\thappy',
      'enum\tpaths.kind\tvariant',
      'enum\tstakeholders.kind\trecipient',
      '',
    ].join('\n'),
  )
  assert.deepEqual(compare(types, actual).slice(0, 3), [
    'the schema builds public.agent_sessions; the generated types do not describe it',
    'public.cells.content exists in the database and not in the types',
    'public.cells.ghost is in the types and not in the database',
  ])
})

test('a member the database accepts and the union does not list is reported against the union', () => {
  const types = declared(new Map(), TAIL)
  const actual = parseInventory(
    ['enum\tpaths.kind\thappy', 'enum\tpaths.kind\tvariant', 'enum\tpaths.kind\texception'].join(
      '\n',
    ),
  )
  assert.ok(
    compare(types, actual).includes(
      "public.paths.kind accepts 'exception' in the database and PathKind does not list it",
    ),
  )
})

test('a member the union lists and the database refuses is reported against the constraint', () => {
  const types = declared(new Map(), TAIL)
  const actual = parseInventory('enum\tpaths.kind\thappy\n')
  assert.ok(
    compare(types, actual).includes(
      "PathKind lists 'variant' and public.paths.kind does not accept it in the database",
    ),
  )
})

test('a vocabulary the types declare nothing about is reported as an absent union', () => {
  const types = declared(new Map(), '')
  const actual = parseInventory('enum\tpaths.kind\thappy\n')
  assert.ok(
    compare(types, actual).includes(
      'public.paths.kind is closed to a fixed list; the generated types declare no PathKind',
    ),
  )
})

test('a union over a vocabulary the database never closes is reported against the database', () => {
  const types = declared(new Map(), TAIL)
  assert.ok(
    compare(types, parseInventory('')).includes(
      'PathKind is the union over public.paths.kind; the database closes no such vocabulary',
    ),
  )
})

test('the generated types still parse into tables, columns and the four unions', () => {
  const source = readApp('src/types/database.ts')
  const tables = parseGeneratedTypes(source)
  assert.ok(tables.size > 10, 'expected the app schema, got ' + tables.size + ' tables')
  assert.ok(tables.get('cells')?.has('id'))
  const bySubject = declaredVocabularies(parseEnumUnions(source))
  assert.deepEqual(
    [...bySubject.keys()].sort(),
    ['entity_status', 'lanes.lane_role', 'paths.kind', 'stakeholders.kind'],
  )
})
