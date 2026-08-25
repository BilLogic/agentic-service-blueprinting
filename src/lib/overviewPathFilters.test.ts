import { describe, expect, it } from 'vitest'
import { collectOverviewPathOptions } from '@/lib/overviewPathFilters'
import type { PathListItem } from '@/lib/pathSelection'

function path(id: string, name: string, path_type: PathListItem['path_type']) {
  return { id, name, summary: null, note: null, path_type }
}

describe('collectOverviewPathOptions', () => {
  it('uses the filter key as id and keeps the real uuid in pathIds', () => {
    const options = collectOverviewPathOptions(
      new Map([['s1', [path('11111111-1111-1111-1111-111111111111', 'Happy Path', 'happy')]]]),
    )

    expect(options).toHaveLength(1)
    // The composite key is what overview filtering groups on — not a uuid.
    expect(options[0].id).toBe('happy:Happy Path')
    // …and the row a rename or delete has to address is still reachable.
    expect(options[0].pathIds).toEqual(['11111111-1111-1111-1111-111111111111'])
  })

  it('records every scenario’s uuid when one filter row folds several paths', () => {
    const options = collectOverviewPathOptions(
      new Map([
        ['s1', [path('id-a', 'Happy Path', 'happy')]],
        ['s2', [path('id-b', 'Happy Path', 'happy')]],
      ]),
    )

    expect(options).toHaveLength(1)
    // Two real rows behind one filter entry: callers that write must be able
    // to see the ambiguity rather than silently picking the first.
    expect(options[0].pathIds).toEqual(['id-a', 'id-b'])
  })

  it('keeps distinct names apart', () => {
    const options = collectOverviewPathOptions(
      new Map([
        [
          's1',
          [
            path('id-a', 'Happy Path', 'happy'),
            path('id-b', 'Card Declined', 'unhappy'),
          ],
        ],
      ]),
    )

    expect(options.map((option) => option.id)).toEqual([
      'unhappy:Card Declined',
      'happy:Happy Path',
    ])
    expect(options.map((option) => option.pathIds)).toEqual([['id-b'], ['id-a']])
  })
})
