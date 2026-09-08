import { describe, expect, it } from 'vitest'
import {
  groupPathsIntoColumns,
  PATH_COLUMN_BY_KIND,
  type PathOption,
} from '@/components/blueprint/PathMultiSelect'
import { PATH_KINDS } from '@/lib/versionValidation'
import type { PathKind } from '@/types/database'

/*
  ONE PATH, ONE COLUMN.

  The picker used to choose a column by filtering the same list against two
  `Set`s of kinds and treating the two results as disjoint. They were not —
  one kind sat in both sets — so a path of that kind was drawn twice, once in
  each column. Nothing was in a position to catch it: a `Set` absorbs a
  repeated member instead of failing, and two independent membership tests
  have no overlap for a compiler to look at.

  What follows asserts the property that defect violated and nothing narrower.
  It names no kind and no column, and it never says how many kinds there are.
  It reads the vocabulary the app declares, builds every short arrangement of
  it, and checks that grouping is a partition: everything that goes in comes
  back out, exactly once, with nothing invented. A fourth kind would arrive as
  a migration and a decision — it should not also arrive as an edit here.
*/

const VOCABULARY: readonly PathKind[] = PATH_KINDS

function option(kind: PathKind, index: number): PathOption {
  return {
    id: `${kind}-${index}`,
    name: `${kind} ${index}`,
    summary: null,
    kind,
  }
}

/** Every ordering of `kinds`, with repeats, from empty up to `maxLength`. */
function everyArrangement(
  kinds: readonly PathKind[],
  maxLength: number,
): PathKind[][] {
  const all: PathKind[][] = [[]]
  let frontier: PathKind[][] = [[]]

  for (let length = 1; length <= maxLength; length += 1) {
    frontier = frontier.flatMap((prefix) =>
      kinds.map((kind) => [...prefix, kind]),
    )
    all.push(...frontier)
  }

  return all
}

describe('grouping a picker’s paths into columns', () => {
  it('places every path in exactly one column, for any input', () => {
    for (const kinds of everyArrangement(VOCABULARY, 5)) {
      // Each option carries a distinct id, so comparing the sorted ids either
      // side of the call is an exact accounting: a path dropped, duplicated
      // or conjured all fail it.
      const paths = kinds.map(option)
      const placed = groupPathsIntoColumns(paths).flat()

      expect(placed.map((path) => path.id).sort(), kinds.join(',')).toEqual(
        paths.map((path) => path.id).sort(),
      )
    }
  })

  it('returns no empty column', () => {
    // The grouping walks a fixed list of columns, so a column nothing landed
    // in must contribute nothing rather than an empty slot the picker would
    // render as a gap.
    for (const kinds of everyArrangement(VOCABULARY, 4)) {
      const columns = groupPathsIntoColumns(kinds.map(option))

      expect(
        columns.filter((column) => column.length === 0),
        kinds.join(','),
      ).toEqual([])
    }
  })

  it('still places a path whose kind it does not recognise', () => {
    // A row written against a newer schema than this build. Dropping it would
    // hide a path from the picker, which is the same failure as drawing it
    // twice, pointed the other way.
    const unknown = 'a-kind-this-build-has-never-heard-of' as PathKind
    const stranger = option(unknown, 0)
    const placed = groupPathsIntoColumns([
      ...VOCABULARY.map(option),
      stranger,
    ]).flat()

    expect(placed.filter((path) => path.id === stranger.id)).toHaveLength(1)
  })

  it('assigns a column to every kind the app declares', () => {
    // Totality, read off the roster rather than listed here. It is what makes
    // the paragraph above true without a fallback doing the work.
    for (const kind of VOCABULARY) {
      expect(PATH_COLUMN_BY_KIND[kind], kind).toBeDefined()
    }
  })
})
