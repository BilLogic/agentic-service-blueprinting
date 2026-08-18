import { describe, expect, it } from 'vitest'
import { groupSlicesByType, sliceTypeGroup } from '@/lib/sliceGroups'

describe('sliceTypeGroup', () => {
  it('maps the five canonical types onto themselves, case-insensitively', () => {
    expect(sliceTypeGroup('journey')).toBe('journey')
    expect(sliceTypeGroup('STEP')).toBe('step')
    expect(sliceTypeGroup('Lane')).toBe('lane')
    expect(sliceTypeGroup('cell')).toBe('cell')
    expect(sliceTypeGroup('custom')).toBe('custom')
  })

  it('files unknown types under custom', () => {
    expect(sliceTypeGroup('freeform')).toBe('custom')
    expect(sliceTypeGroup('')).toBe('custom')
  })
})

describe('groupSlicesByType', () => {
  const slice = (id: string, slice_type: string) => ({ id, slice_type })

  it('returns only non-empty groups, in canonical order', () => {
    const groups = groupSlicesByType([
      slice('a', 'custom'),
      slice('b', 'journey'),
      slice('c', 'journey'),
    ])
    expect(groups.map((group) => group.type)).toEqual(['journey', 'custom'])
    expect(groups[0]?.slices.map((entry) => entry.id)).toEqual(['b', 'c'])
  })

  it('is empty for an empty list', () => {
    expect(groupSlicesByType([])).toEqual([])
  })

  it('sweeps unknown types into the custom group', () => {
    const groups = groupSlicesByType([slice('a', 'freeform')])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.type).toBe('custom')
  })
})
