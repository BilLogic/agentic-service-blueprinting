import { describe, expect, it } from 'vitest'
import { BLUEPRINT_ARROW_PATH_KINDS } from '@/components/blueprint/BlueprintArrowMarkerDefs'
import { TOOL_SPECS } from '@/lib/agent/tools/specs'
import { PATH_KIND_ARROW_COLORS, PATH_KIND_COLORS } from '@/lib/pathColorTheme'
import { PATH_KIND_LABELS, PATH_KIND_SHORT_LABELS } from '@/lib/pathKindTheme'
import { PATH_KINDS } from '@/lib/versionValidation'
import type { PathKind as DatabasePathKind } from '@/types/database'

/*
  ONE MEMBER, ONE ENTRY.

  `paths.kind` is a CHECK constraint — `paths_kind_check check (kind in
  ('happy', 'variant', 'exception'))` — and `variant` is a fold: older
  spellings were rewritten into it. WHICH spelling went where is a fact about
  one database's own history, and the deployments of this template do not
  share one, so it is not stated here — nor is the migration that did it,
  which is a filename in one repository and nothing in the next. The rename
  map in `scripts/retired-vocabulary.mjs` records this repository's, and is
  read against the migrations that ran HERE. The app carries that vocabulary
  in two shapes, and only one of them is checked by the compiler.

  A `Record<PathKind, …>` cannot hold a member twice: a repeated key is a
  syntax the type system rejects, so the label and colour maps defend
  themselves. An ARRAY of the same members defends nothing — `['happy',
  'variant', 'variant', 'exception']` types clean, because the union it
  derives dedupes on the way out. So the duplicate survives in the one shape
  that is ITERATED, and it surfaces where the iteration renders: the
  create-version dialog drew its Kind picker straight off the roster and put
  two identical Variant buttons on screen, with React warning about the
  repeated key.

  That is the invariant here, and it is deliberately not a census. Nothing
  below counts the kinds or names them — a fourth kind would be a migration
  and a considered decision, and this file should not have an opinion about
  it. What it asserts is that each roster holds each of its members ONCE, and
  that every roster holds the same members as the maps the compiler is
  already guarding.
*/

/** Every array-shaped path-kind roster the app iterates. */
const ROSTERS: Record<string, readonly string[]> = {
  'versionValidation PATH_KINDS': PATH_KINDS,
  BLUEPRINT_ARROW_PATH_KINDS,
}

/** Every compiler-guarded `Record<PathKind, …>`, keyed on the same vocabulary. */
const KIND_KEYED_MAPS: Record<string, Record<string, unknown>> = {
  'versionValidation PATH_KIND_LABELS': PATH_KIND_LABELS,
  PATH_KIND_SHORT_LABELS,
  PATH_KIND_COLORS,
  PATH_KIND_ARROW_COLORS,
}

const kindVocabulary = new Set(Object.keys(PATH_KIND_LABELS))

describe('the path-kind rosters', () => {
  it('lists each kind once', () => {
    // The assertion a duplicate fails, stated without saying how many kinds
    // there are. A picker rendered from a roster shows one button per entry,
    // so a repeated entry is a repeated button and a repeated React key.
    for (const [name, roster] of Object.entries(ROSTERS)) {
      expect([...new Set(roster)], name).toHaveLength(roster.length)
    }
  })

  it('holds the same members as the maps the compiler already guards', () => {
    // A roster and a `Record<PathKind, …>` are two spellings of one
    // vocabulary. Comparing them catches the other direction of drift — a
    // kind added to the maps and forgotten in the roster is a kind the
    // database accepts and the picker never offers.
    for (const [name, roster] of Object.entries(ROSTERS)) {
      expect([...new Set(roster)].sort(), name).toEqual([...kindVocabulary].sort())
    }
    for (const [name, map] of Object.entries(KIND_KEYED_MAPS)) {
      expect(Object.keys(map).sort(), name).toEqual([...kindVocabulary].sort())
    }
  })

  it('derives a type the generated database union agrees with', () => {
    /*
      `versionValidation` derives its own `PathKind` from the roster, while
      the rest of the app imports the generated one. The two aliases below
      are the assertion and `tsc` is what checks them: a member in one union
      and not the other stops the build. The expectation only keeps the
      aliases reachable.
    */
    type Assignable<A extends B, B> = [A, B] extends [B, A] ? true : true
    type RosterFitsDatabase = Assignable<
      (typeof PATH_KINDS)[number],
      DatabasePathKind
    >
    type DatabaseFitsRoster = Assignable<
      DatabasePathKind,
      (typeof PATH_KINDS)[number]
    >
    const bothDirections: [RosterFitsDatabase, DatabaseFitsRoster] = [true, true]
    expect(bothDirections).toEqual([true, true])
  })
})

/** Every `enum` array anywhere inside a tool spec's JSON Schema, with its path. */
function collectEnums(
  node: unknown,
  path: string,
  found: Array<{ path: string; members: unknown[] }> = [],
): Array<{ path: string; members: unknown[] }> {
  if (Array.isArray(node)) {
    node.forEach((item, index) => collectEnums(item, `${path}[${index}]`, found))
    return found
  }
  if (node === null || typeof node !== 'object') return found

  for (const [key, value] of Object.entries(node)) {
    if (key === 'enum' && Array.isArray(value)) {
      found.push({ path: `${path}.enum`, members: value })
      continue
    }
    collectEnums(value, `${path}.${key}`, found)
  }
  return found
}

/*
  The same defect has a second home. A tool spec's `enum` is a roster too —
  an array, unguarded by any Record — except this one is not rendered, it is
  SENT, as the JSON Schema the model reads before it picks an argument. Both
  ways it can be wrong cost the same thing: a repeated member is a wasted
  choice, and a member the CHECK constraint refuses is a call the model can
  make and the insert rejects. `create_path` carried both.
*/
describe('the agent tool schemas', () => {
  const enums = TOOL_SPECS.flatMap((spec) =>
    collectEnums(spec.parameters, spec.name),
  )

  it('has enums to check', () => {
    // Guards the walker: a refactor that reshapes `parameters` must not turn
    // the two assertions below into vacuous passes.
    expect(enums.length).toBeGreaterThan(0)
  })

  it('offers each enum member once', () => {
    for (const { path, members } of enums) {
      expect([...new Set(members)], path).toHaveLength(members.length)
    }
  })

  it('keeps an enum that speaks the path-kind vocabulary inside it', () => {
    // Stated as containment rather than as a list: any enum that offers a
    // path kind at all must offer nothing but path kinds. `named` was in
    // here — a value no `PathKind` holds, no map keys, and `paths_kind_check`
    // refuses, so the model could pick it and the write would fail.
    for (const { path, members } of enums) {
      if (!members.some((member) => kindVocabulary.has(member as string))) {
        continue
      }
      const strangers = members.filter(
        (member) => !kindVocabulary.has(member as string),
      )
      expect(strangers, path).toEqual([])
    }
  })
})
