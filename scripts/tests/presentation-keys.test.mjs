/**
 * The fill vocabulary — the one surface three guards each miss for a
 * different reason.
 *
 * A rename moved the lane roles `frontstage_tech` / `backstage_tech` to
 * `frontstage_touchpoints` / `backstage_touchpoints`. The fills went on
 * saying `frontstage-tech` for a fortnight, in `blueprintCellStyle.ts` and in
 * `blueprint.css`, while `blueprintTheme.ts` read:
 *
 *     frontstage_touchpoints: cellStyleFromFill('frontstage-tech', …)
 *
 * Nothing was broken. Each guard declines for a reason that is correct in
 * isolation: `check:identifiers` sweeps database identifiers and a CSS
 * attribute value is not one; `retiredFragmentsIn` matches substrings and the
 * fragment has an underscore where the fill has a hyphen; `check:copy` reads
 * what a person reads and nobody reads an attribute selector. The seam was
 * uncovered rather than broken, which is the only kind of gap worth a new
 * file.
 *
 * SUBJECT: the fill vocabulary itself — `BLUEPRINT_LANE_ROLES` and the
 * `[data-blueprint-lane='…']` selectors that give those fills their colours.
 * Not whole files. That matters: `visual`, `picture` and `layer` are all
 * retired presentation spellings and all appear in ordinary prose across the
 * tree, so a file-wide sweep would be noise and would be narrowed until it
 * meant nothing.
 *
 * IF THIS PRODUCES A FALSE POSITIVE, NARROW THE SUBJECT — NEVER THE WORD LIST.
 * The word list is derived from `RENAME_MAP`, through the retired identifier
 * fragments, on purpose; `retired-copy.test.mjs` states the reasoning at
 * length.
 *
 * ── A fill is a palette slot, not a role ──────────────────────────────────
 *
 * Worth stating because it is the thing that makes the rename a judgement
 * rather than a substitution. Several lane names point at one fill —
 * `Frontstage Actions` borrows `frontstage-touchpoint` in the legacy
 * name-keyed map, and `backstage_touchpoints` takes the `evidence` fill in
 * the role-keyed one. So these checks assert that a fill name contains no
 * word the schema has retired; they do NOT assert that a fill is named after
 * whichever role happens to use it, because that is not what a fill is.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { RETIRED_IDENTIFIER_FRAGMENTS } from '../retired-vocabulary.mjs'

/**
 * Every retired fragment in its presentation spelling: hyphens where the
 * identifier has underscores, because a fill name and a CSS attribute value
 * are hyphenated. Derived rather than listed, so the two spellings of one
 * retirement cannot disagree. Longest first, so a longer spelling is reported
 * before a shorter one it contains. A fragment with no underscore derives to
 * itself, which is correct: `visual` is `visual` in every spelling.
 */
export const RETIRED_PRESENTATION_SPELLINGS = Object.freeze(
  [...new Set(RETIRED_IDENTIFIER_FRAGMENTS.map((f) => f.replaceAll('_', '-')))].sort(
    (a, b) => b.length - a.length || a.localeCompare(b),
  ),
)

const STYLE_MODULE = 'src/lib/blueprintCellStyle.ts'
const STYLESHEET = 'src/styles/blueprint.css'
const THEME = 'src/lib/blueprintTheme.ts'

/** The declared fill names, read from the array the type is checked against. */
export function declaredFills(source) {
  const block = /BLUEPRINT_LANE_ROLES\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(source)
  if (!block) throw new Error('BLUEPRINT_LANE_ROLES is no longer an array literal')
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
}

/** The fill names the stylesheet gives colours to. */
export function styledFills(css) {
  return [...css.matchAll(/\[data-blueprint-lane='([^']+)'\]/g)].map((m) => m[1])
}

/** The fills something actually asks for. */
export function referencedFills(source) {
  return [...source.matchAll(/cellStyleFromFill\('([^']+)'/g)].map((m) => m[1])
}

/** Retired spellings inside a fill name, as substrings. */
export function retiredSpellingsIn(fill) {
  const lower = fill.toLowerCase()
  return RETIRED_PRESENTATION_SPELLINGS.filter((word) => lower.includes(word))
}

const styleModule = readFileSync(STYLE_MODULE, 'utf8')
const stylesheet = readFileSync(STYLESHEET, 'utf8')
const theme = readFileSync(THEME, 'utf8')

test('no fill name contains a word the schema has retired', () => {
  const offenders = declaredFills(styleModule)
    .map((fill) => [fill, retiredSpellingsIn(fill)])
    .filter(([, words]) => words.length > 0)

  assert.deepEqual(
    offenders,
    [],
    offenders.map(([fill, words]) => `${fill} still says ${words.join(', ')}`).join('; '),
  )
})

test('and the check is the one that would have caught the fortnight', () => {
  // The exact pair that slipped through, against the real word list. Without
  // this the test above passes on a tree where the derivation is broken and
  // says nothing at all.
  assert.deepEqual(retiredSpellingsIn('frontstage-tech'), ['frontstage-tech'])
  assert.deepEqual(retiredSpellingsIn('backstage-tech'), ['backstage-tech'])
  assert.deepEqual(retiredSpellingsIn('frontstage-touchpoint'), [])
})

test('the stylesheet and the module declare the same fills', () => {
  // A fill declared in one and not the other is a cell with no colour, or a
  // colour no cell can ask for. Both are silent.
  assert.deepEqual(declaredFills(styleModule).slice().sort(), styledFills(stylesheet).slice().sort())
})

test('every fill the theme asks for is declared', () => {
  const declared = new Set(declaredFills(styleModule))
  const missing = referencedFills(theme).filter((fill) => !declared.has(fill))
  assert.deepEqual(missing, [])
})

test('each rule goes red on the shape it exists for', () => {
  // Non-vacuity, per the repo rule: a check that examined nothing reads
  // identical to a clean tree.
  const renamedBack = styleModule.replaceAll('frontstage-touchpoint', 'frontstage-tech')
  assert.ok(
    declaredFills(renamedBack).some((fill) => retiredSpellingsIn(fill).length > 0),
    'the retired-word rule did not fire on the name that actually shipped',
  )

  const dropped = stylesheet.replace("[data-blueprint-lane='support']", '[data-blueprint-lane-x]')
  assert.notDeepEqual(
    styledFills(dropped).slice().sort(),
    declaredFills(styleModule).slice().sort(),
    'the agreement rule did not fire on a fill that lost its colour',
  )

  const declared = new Set(declaredFills(styleModule))
  assert.ok(
    referencedFills("cellStyleFromFill('frontstage-tech',").some((fill) => !declared.has(fill)),
    'the reference rule did not fire on a fill nothing declares',
  )
})

test('the readers throw rather than pass on a tree that lost the declaration', () => {
  // The failure mode a regexp reader has and an import does not: the shape
  // moves, the match returns nothing, and every assertion above becomes
  // vacuously true.
  assert.throws(() => declaredFills('export const BLUEPRINT_LANE_ROLES = SOMETHING_ELSE'))
  assert.deepEqual(styledFills('/* no lane rules here */'), [])
})
