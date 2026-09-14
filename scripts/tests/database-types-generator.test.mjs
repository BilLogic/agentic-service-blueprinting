/**
 * The generator's pure parts, and the import graph the deployment check
 * depends on.
 *
 * Standing the database up is the CI job's proof (`check:database-types`
 * regenerates and diffs there). What can be wrong without a database is held
 * here: how a CHECK's member list is read, what the derived tail looks like,
 * and that the superset check a deployment runs out of the installed package
 * never loads a module that needs this repository's development dependencies.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ENUMS, enumSubject, membersOfCheck } from '../database-vocabularies.mjs'
import { renderTail } from '../generate-database-types.mjs'
import { parseEnumUnions } from '../check-schema-inventory.mjs'

const SCRIPTS = fileURLToPath(new URL('..', import.meta.url))

test('the members of a CHECK are read in declaration order, quotes unescaped', () => {
  assert.deepEqual(
    membersOfCheck("CHECK ((kind = ANY (ARRAY['happy'::text, 'variant'::text, 'exception'::text])))"),
    ['happy', 'variant', 'exception'],
  )
  assert.deepEqual(
    membersOfCheck("CHECK ((VALUE = ANY (ARRAY['it''s'::text, 'plain'::text])))"),
    ["it's", 'plain'],
  )
  // A nullable column's CHECK wraps the list in an OR; the list is still the list.
  assert.deepEqual(
    membersOfCheck("CHECK (((lane_role IS NULL) OR (lane_role = ANY (ARRAY['storyboard'::text]))))"),
    ['storyboard'],
  )
  // Any other shape is not a vocabulary.
  assert.equal(membersOfCheck('CHECK ((cardinality(cell_ids) = cardinality(cell_keys)))'), null)
})

test('the derived tail is what the inventory parser reads back, union for union', () => {
  const enums = ENUMS.map((entry) => ({ ...entry, members: ['one', 'two'] }))
  const tail = renderTail(enums)
  const unions = parseEnumUnions(tail)
  for (const entry of ENUMS) {
    assert.deepEqual(unions.get(entry.name), ['one', 'two'], entry.name)
  }
  // And the aliases beside them, which the parser is right to leave alone.
  assert.match(tail, /^export type Cell = Database\['public'\]\['Tables'\]\['cells'\]\['Row'\]$/m)
  assert.ok(!unions.has('Cell'))
})

test('every vocabulary names one subject, and no two name the same', () => {
  const subjects = ENUMS.map(enumSubject)
  assert.deepEqual([...new Set(subjects)], subjects)
  for (const subject of subjects) assert.match(subject, /^[a-z_]+(?:\.[a-z_]+)?$/)
})

/**
 * The imports a script reaches, transitively, through relative specifiers —
 * plus every bare specifier it meets on the way.
 */
function importGraph(file, seen = new Set(), bare = new Set()) {
  if (seen.has(file)) return { seen, bare }
  seen.add(file)
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(/^import\s[^'"]*['"]([^'"]+)['"]/gm)) {
    const specifier = match[1]
    if (specifier.startsWith('.')) importGraph(resolve(dirname(file), specifier), seen, bare)
    else bare.add(specifier)
  }
  return { seen, bare }
}

test('the superset check a deployment runs loads nothing that needs a development dependency', () => {
  // A deployment installs this package's dependencies and not its development
  // ones. The generator needs `pg` and the typegen engine; the check a
  // deployment runs against its own types file must not, and must not reach
  // the generator either.
  const { seen, bare } = importGraph(resolve(SCRIPTS, 'check-database-types-superset.mjs'))
  const reached = [...seen].map((file) => file.slice(SCRIPTS.length))
  assert.ok(!reached.includes('generate-database-types.mjs'), reached.join(', '))
  for (const specifier of bare) {
    assert.ok(specifier.startsWith('node:'), `${specifier} is not a built-in module`)
  }
})
