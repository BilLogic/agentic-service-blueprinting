import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  classListHas,
  classListOf,
  classLists,
  classListsIn,
} from '@/lib/classList'

/**
 * The class-list reader, against this tree's own spellings.
 *
 * A type rule is almost never about one utility. "Labels are medium" is
 * `text-xs` + `font-medium` together; "an eyebrow is register 3" is
 * `font-mono` + `uppercase` + `tracking-*` together. `tokenModel.classUses`
 * splits every quoted string into individual utilities, so a guard written
 * against it cannot ask whether a call site contains a token — and a
 * substring search for the token's own string is defeated the moment the
 * classes are reordered or split across `cn()` arguments. This file is the
 * proof that the reader sees those two shapes, using strings lifted from
 * the tree rather than invented ones. It asserts no rule of its own.
 */

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const CELL_BADGE_FILE = 'components/editor/SlicePresentation.tsx'
const SEQUENCE_BADGE_FILE = 'components/blueprint/BlueprintCellButton.tsx'
const EYEBROW_FILE = 'components/blueprint/ScenarioSlideHeader.tsx'
const HEADER_TEXT_FILE = 'lib/canvasHeaderStyle.ts'
const HEADER_CN_FILE = 'components/blueprint/StepHeaderAffordance.tsx'
const NAMED_CN_FILE = 'components/blueprint/StepPanel.tsx'

/** Read a source file under `src/`, as the tree spells it. */
function sourceOf(file: string): string {
  return readFileSync(resolve(SRC, file), 'utf8')
}

/**
 * The first `className="…"` in `file` whose value contains `needle`.
 *
 * The needle is how we point at a real call site without restating its
 * whole string here; the value that comes back is the string the file
 * actually wrote.
 */
function classNameString(file: string, needle: string): string {
  const source = sourceOf(file)
  const match = [
    ...source.matchAll(/className\s*=\s*"([^"]*)"/g),
    ...source.matchAll(/className\s*=\s*'([^']*)'/g),
  ].find((entry) => entry[1].includes(needle))
  expect(match, `${file} should write a className containing ${needle}`).toBeTruthy()
  return match![1]
}

describe('classListOf', () => {
  it('splits a single class string on whitespace', () => {
    const cellBadge = classNameString(CELL_BADGE_FILE, 'text-sm text-foreground')
    expect(classListOf(cellBadge)).toEqual(cellBadge.split(/\s+/).filter(Boolean))
  })

  it('drops falsey cn() arguments and flattens nested lists', () => {
    // Pieces of the sequence badge, fed in the shape `cn()` actually takes.
    const sequenceBadge = classNameString(
      SEQUENCE_BADGE_FILE,
      'font-mono text-3xs font-medium',
    )
    const [mono, size, weight, nums] = ['font-mono', 'text-3xs', 'font-medium', 'tabular-nums']
    expect(sequenceBadge.split(/\s+/)).toEqual(expect.arrayContaining([mono, size, weight, nums]))
    expect(
      classListOf([`${mono} ${size}`, false, null, undefined, [weight, nums]]),
    ).toEqual([mono, size, weight, nums])
  })
})

describe('classListHas', () => {
  it('reports a token present in any order, including interleaved', () => {
    // The sequence badge writes `font-mono`, then size and weight, then
    // `tabular-nums`. A substring search for the token string misses it;
    // the list reader does not.
    const sequenceBadge = classNameString(SEQUENCE_BADGE_FILE, 'font-mono')
    expect(sequenceBadge).toContain('tabular-nums')
    expect(sequenceBadge).not.toContain('font-mono tabular-nums')
    expect(classListHas(sequenceBadge, 'font-mono tabular-nums')).toBe(true)
    expect(classListHas(sequenceBadge, ['tabular-nums', 'font-mono'])).toBe(true)
  })

  it('is false when any token class is missing', () => {
    const cellBadge = classNameString(CELL_BADGE_FILE, 'text-sm text-foreground')
    expect(classListHas(cellBadge, 'text-sm text-foreground')).toBe(true)
    expect(classListHas(cellBadge, 'text-xs font-medium')).toBe(false)
  })
})

describe('classListsIn', () => {
  it('reads a class list written as a single string', () => {
    const source = sourceOf(CELL_BADGE_FILE)
    const lists = classListsIn(source, CELL_BADGE_FILE)
    expect(
      lists.some((site) =>
        classListHas(site.classes, 'text-sm text-foreground'),
      ),
    ).toBe(true)
  })

  it('reads a class list split across cn() arguments', () => {
    // The phase eyebrow writes `uppercase` in one argument and the size in
    // the next (`compact ? 'text-3xs' : 'text-xs'`). No quoted string in
    // the file holds both; the call site as a list does.
    const source = sourceOf(EYEBROW_FILE)
    expect(source).not.toMatch(/['"][^'"]*uppercase[^'"]*text-xs[^'"]*['"]/)
    const lists = classListsIn(source, EYEBROW_FILE)
    expect(
      lists.some((site) => classListHas(site.classes, ['uppercase', 'text-xs'])),
    ).toBe(true)
  })

  it('reads a class written inside a conditional as part of the call site', () => {
    // The filmstrip cell button: `font-mono` and `tabular-nums` in the
    // leading string, `border-dashed` only on `!cell && '…'`. A guard that
    // asked the quoted strings separately would never see them together.
    const source = sourceOf(CELL_BADGE_FILE)
    const lists = classListsIn(source, CELL_BADGE_FILE)
    expect(
      lists.some((site) =>
        classListHas(site.classes, ['font-mono', 'tabular-nums', 'border-dashed']),
      ),
    ).toBe(true)
  })

  it('reads cn(CANVAS_HEADER_TEXT, extra) as the named list plus the extra class', () => {
    const lists = classListsIn(
      `${sourceOf(HEADER_TEXT_FILE)}\n${sourceOf(HEADER_CN_FILE)}`,
      HEADER_CN_FILE,
    )
    expect(
      lists.some((site) =>
        classListHas(site.classes, ['text-xs', 'font-semibold', 'truncate']),
      ),
    ).toBe(true)
  })
})

describe('classLists', () => {
  it('walks the tree and finds the lifted call sites', () => {
    const sites = classLists()
    expect(
      sites.some(
        (site) =>
          site.file === CELL_BADGE_FILE &&
          classListHas(site.classes, 'text-sm text-foreground'),
      ),
    ).toBe(true)
    expect(
      sites.some(
        (site) =>
          site.file === SEQUENCE_BADGE_FILE &&
          classListHas(site.classes, ['font-mono', 'tabular-nums']) &&
          !site.classes.join(' ').includes('font-mono tabular-nums'),
      ),
    ).toBe(true)
    expect(
      sites.some(
        (site) =>
          site.file === NAMED_CN_FILE &&
          classListHas(site.classes, ['text-2xs', 'truncate']),
      ),
    ).toBe(true)
  })

  it('enforces no rule of its own', () => {
    // The reader reports what is written, including sizes and weights a
    // later guard may forbid. Returning them is the whole of its job.
    const sites = classLists()
    expect(sites.some((site) => site.classes.includes('text-2xs'))).toBe(true)
    expect(sites.some((site) => site.classes.includes('font-semibold'))).toBe(
      true,
    )
  })
})
