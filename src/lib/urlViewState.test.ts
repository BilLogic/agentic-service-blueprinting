import { describe, expect, it } from 'vitest'
import { parseUrlViewState, serializeUrlViewState } from '@/lib/urlViewState'

describe('parseUrlViewState', () => {
  it('reads a slice focus link', () => {
    expect(parseUrlViewState('?slice=s-1')).toEqual({ kind: 'slice', sliceId: 's-1' })
  })

  it('reads a presentation link with its slide', () => {
    expect(parseUrlViewState('?slice=s-1&mode=present&slide=3')).toEqual({
      kind: 'present',
      sliceId: 's-1',
      slide: 3,
    })
  })

  it('still reads a link written before the param was renamed', () => {
    // `frame` was this param's name before `slide`, and a presentation link
    // is a thing people paste into chat. Without the alias every one of those
    // already sent lands on slide 1 with nothing reporting it.
    expect(parseUrlViewState('?slice=s-1&mode=present&frame=3')).toEqual({
      kind: 'present',
      sliceId: 's-1',
      slide: 3,
    })
  })

  it('reads a cell share link', () => {
    expect(parseUrlViewState('?cell=c-9')).toEqual({ kind: 'blueprint', cellId: 'c-9' })
  })

  it('lets the slice tab win when a link carries both', () => {
    // A cell panel behind a slice tab is invisible; the tab is the view the
    // link asked for.
    expect(parseUrlViewState('?slice=s-1&cell=c-9')).toEqual({
      kind: 'slice',
      sliceId: 's-1',
    })
  })

  it('is null when no view params are present', () => {
    expect(parseUrlViewState('')).toBeNull()
    expect(parseUrlViewState('?utm_source=slack')).toBeNull()
  })
})

describe('serializeUrlViewState', () => {
  it('round-trips a cell share link', () => {
    const search = serializeUrlViewState({ kind: 'blueprint', cellId: 'c-9' })
    expect(search).toBe('?cell=c-9')
    expect(parseUrlViewState(search)).toEqual({ kind: 'blueprint', cellId: 'c-9' })
  })

  it('writes nothing for the plain blueprint view', () => {
    expect(serializeUrlViewState({ kind: 'blueprint' })).toBe('')
    expect(serializeUrlViewState({ kind: 'blueprint', cellId: undefined })).toBe('')
  })

  it('keeps slice and present links unchanged', () => {
    expect(serializeUrlViewState({ kind: 'slice', sliceId: 's-1' })).toBe('?slice=s-1')
    expect(
      serializeUrlViewState({ kind: 'present', sliceId: 's-1', slide: 2 }),
    ).toBe('?slice=s-1&mode=present&slide=2')
  })

  it('never writes the retired param back', () => {
    const search = serializeUrlViewState({ kind: 'present', sliceId: 's-1', slide: 3 })
    expect(search).toContain('slide=3')
    expect(search).not.toContain('frame=')
  })
})
