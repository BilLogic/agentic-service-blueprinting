/**
 * One roster of lane roles, in the six places that have to state it.
 *
 * `lanes_lane_role_check` has closed `lanes.lane_role` to eight values since
 * `21000122000000`. The wire format did not follow: `references/ir-schema.json`
 * took any `^[a-z0-9][a-z0-9_]*$` and `scripts/validate_ir.py` passed a ninth
 * role in silence, so a document validated at authoring time and was refused
 * by a constraint violation part-way through its import (#204). The schema
 * closed rather than the constraint opening — but JSON Schema cannot import a
 * list, and neither can a stdlib-only Python script, so closing it MADE two
 * more copies of the eight.
 *
 * A duplicated list with nothing holding it is how the first drift started, so
 * this is what holds them: the constraint in the generated portable core is the
 * authority, and the four copies are compared to it set for set. The dump is
 * a committed file, so this runs on every pull request with no database.
 *
 * The fourth copy was added after the fact, and it is the one that proves the
 * point. `ROLE_STYLES` in `src/lib/blueprintTheme.ts` decides which fill a
 * lane is drawn in, keyed by role, and it is a `Record<string, …>` — so a key
 * outside the vocabulary is not a type error and a missing key is not either.
 * It drifted in both directions at once and stayed that way (#212): two keys
 * no row could ever hold, and no key for `partner_actions`, which rows do
 * hold. Nothing in the app can notice a colour that is never asked for.
 *
 * The sixth is the one a model reads. `LANE_ROLE_FILTER_PARAM` is the whole
 * description of the value set the canvas agent's `lane_role` filter is ever
 * given, so a role it still offers after the constraint dropped one is not
 * cosmetic: the filter matches no lane and the read reports an empty set as
 * the answer.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { schemaInventory } from '../check-instance-vocabulary.mjs'
import { readAppFile } from '../app-source.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))

/**
 * A file of THIS repository, read: the dump, the IR schema, the validator.
 *
 * Three of the five statements of the roster are the reading repository's own
 * — its migrations build the constraint, its `references/` publishes the
 * schema, its `scripts/` refuses on import. The other two are the
 * application's, and `readApp` finds those wherever the application is.
 */
const read = (path) => readFileSync(join(ROOT, path), 'utf8')

/** A file of the APPLICATION, read, whether this tree holds it or the package does. */
const readApp = (path) => readAppFile(ROOT, path)

/** The values `lanes_lane_role_check` accepts, read off the committed dump. */
function constraintRoles() {
  const values = schemaInventory(read('supabase/generated/portable-core.schema.sql')).values.get(
    'lanes.lane_role',
  )
  assert.ok(values, 'the portable core states no CHECK on lanes.lane_role')
  return [...values]
}

/** The enum `references/ir-schema.json` puts on a lane's `role`. */
function schemaRoles() {
  const schema = JSON.parse(read('references/ir-schema.json'))
  return schema.$defs.lane.properties.role.enum
}

/**
 * `CANONICAL_ROLES` in the validator, read as text.
 *
 * The alternative is running python3 from a vitest worker to print it, which
 * makes a check of the roster into a check of the interpreter on the machine.
 */
function validatorRoles() {
  const body = /^CANONICAL_ROLES = \(([^)]*)\)/m.exec(read('scripts/validate_ir.py'))
  assert.ok(body, 'scripts/validate_ir.py no longer declares CANONICAL_ROLES as a literal tuple')
  return [...body[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1])
}

/**
 * `CANONICAL_LANE_ROLES` in the app's contract, whose entries are the exported
 * constants rather than literals — so the constants are resolved first.
 */
function appRoles() {
  const source = readApp('src/lib/laneRoles.ts')
  const literals = new Map(
    [...source.matchAll(/export const ([A-Z][A-Z_]*) = '([a-z_]+)'/g)].map((m) => [m[1], m[2]]),
  )
  const listed = /export const CANONICAL_LANE_ROLES = \[([^\]]*)\]/.exec(source)
  assert.ok(listed, 'src/lib/laneRoles.ts no longer declares CANONICAL_LANE_ROLES as an array')
  return (listed[1].match(/[A-Z][A-Z_]+/g) ?? []).map((name) => {
    const value = literals.get(name)
    assert.ok(value, `CANONICAL_LANE_ROLES names ${name}, which is not an exported role constant`)
    return value
  })
}

/**
 * The keys of `ROLE_STYLES` in the board's theme, read as text.
 *
 * Read as text for the same reason the validator is: importing the module
 * pulls in the whole style layer, and a roster check should not depend on the
 * app building. The entries are read by their `key: cellStyleFromFill(` shape,
 * so a rewrite into some other form is a failure of the reader rather than a
 * silently empty list.
 */
function roleStyleRoles() {
  const block = /const ROLE_STYLES: Record<string, BlueprintLaneStyle> = \{([\s\S]*?)\n\}/.exec(
    readApp('src/lib/blueprintTheme.ts'),
  )
  assert.ok(block, 'src/lib/blueprintTheme.ts no longer declares ROLE_STYLES as an object literal')
  const keys = [...block[1].matchAll(/^ {2}([a-z_]+): cellStyleFromFill\(/gm)].map((m) => m[1])
  assert.ok(
    keys.length,
    'ROLE_STYLES no longer states its fills as `role: cellStyleFromFill(...)` entries',
  )
  return keys
}

const sorted = (roles) => [...roles].sort()

test('the constraint states eight roles, and null besides', () => {
  // The count is asserted because every comparison below is against this list:
  // a dump that parsed to nothing would make the whole file pass in silence.
  assert.equal(constraintRoles().length, 8)
})

test('references/ir-schema.json admits the eight the constraint admits, and null', () => {
  const enumerated = schemaRoles()
  assert.ok(
    enumerated.includes(null),
    'a lane with no blueprint role is legal on purpose — see references/lane-roles.md',
  )
  assert.deepEqual(
    sorted(enumerated.filter((role) => role !== null)),
    sorted(constraintRoles()),
    'the IR schema and lanes_lane_role_check disagree about the lane vocabulary, which is ' +
      'the drift #204 closed: a document validates and is then refused on import. Adding a ' +
      'role is a multi-file act — see references/lane-roles.md.',
  )
})

test('scripts/validate_ir.py refuses by the same list', () => {
  assert.deepEqual(sorted(validatorRoles()), sorted(constraintRoles()))
})

test('src/lib/laneRoles.ts renders by the same list', () => {
  assert.deepEqual(sorted(appRoles()), sorted(constraintRoles()))
})

test('src/lib/blueprintTheme.ts fills by the same list', () => {
  assert.deepEqual(
    sorted(roleStyleRoles()),
    sorted(constraintRoles()),
    'ROLE_STYLES and lanes_lane_role_check disagree about the lane vocabulary. A key the ' +
      'constraint does not admit is a fill no stored role can reach; a role the map omits ' +
      'falls through to the zone fallback and is drawn as a lane it is not. Adding a role is ' +
      'a multi-file act — see references/lane-roles.md.',
  )
})

test("the canvas agent's lane-role filter offers the same list", async () => {
  // Imported rather than read as text: the list is built from
  // `CANONICAL_LANE_ROLES`, so there is no literal in the spec to read.
  const { LANE_ROLE_FILTER_PARAM } = await import('@/lib/agent/tools/specs')
  const offered = /one of: ([a-z_ |]+)$/.exec(LANE_ROLE_FILTER_PARAM.description)
  assert.ok(offered, 'LANE_ROLE_FILTER_PARAM no longer ends with "one of: a | b | …"')
  assert.deepEqual(
    sorted(offered[1].split(' | ')),
    sorted(constraintRoles()),
    'the lane_role filter the agent is offered and lanes_lane_role_check disagree. A role ' +
      'the filter offers and no row can hold returns an empty read that reports success.',
  )
})
