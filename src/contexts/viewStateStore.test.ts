import { describe, expect, it } from 'vitest'
import {
  createInitialViewState,
  tabKey,
  viewStateReducer,
  type ViewState,
} from '@/contexts/viewStateStore'

// Reducer tests for the slice tab store (ported shape from uno-blueprint):
// boot deep links are held as pendingUrlState and only applied against the
// loaded slice list; closing the active tab activates its left neighbor;
// a dead deep link surfaces as a dismissible missing-slice notice.

const base = (): ViewState => createInitialViewState('')

describe('createInitialViewState', () => {
  it('boots with no tabs and no pending state for a bare URL', () => {
    const state = createInitialViewState('')
    expect(state.tabs).toEqual([])
    expect(state.activeKey).toBeNull()
    expect(state.pendingUrlState).toBeNull()
    expect(state.missingSliceId).toBeNull()
  })

  it('holds a ?slice= boot link as pending, never applied blind', () => {
    const state = createInitialViewState('?slice=s-1')
    expect(state.pendingUrlState).toEqual({ kind: 'slice', sliceId: 's-1' })
    expect(state.tabs).toEqual([])
  })

  it('holds a present link with its frame', () => {
    const state = createInitialViewState('?slice=s-1&mode=present&frame=2')
    expect(state.pendingUrlState).toEqual({
      kind: 'present',
      sliceId: 's-1',
      frame: 2,
    })
  })
})

describe('viewStateReducer open/activate/close', () => {
  it('open activates the tab (and re-open only re-activates)', () => {
    let state = viewStateReducer(base(), {
      type: 'open',
      tab: { kind: 'slice', sliceId: 's-1' },
    })
    expect(state.activeKey).toBe('slice:s-1')
    expect(state.tabs).toHaveLength(1)
    state = viewStateReducer(state, {
      type: 'open',
      tab: { kind: 'slice', sliceId: 's-1' },
    })
    expect(state.tabs).toHaveLength(1)
  })

  it('activate(null) returns to the base view without closing tabs', () => {
    let state = viewStateReducer(base(), {
      type: 'open',
      tab: { kind: 'slice', sliceId: 's-1' },
    })
    state = viewStateReducer(state, { type: 'activate', key: null })
    expect(state.activeKey).toBeNull()
    expect(state.tabs).toHaveLength(1)
  })

  it('closing the active tab activates its nearest surviving left neighbor', () => {
    let state = base()
    for (const sliceId of ['s-1', 's-2', 's-3']) {
      state = viewStateReducer(state, {
        type: 'open',
        tab: { kind: 'slice', sliceId },
      })
    }
    state = viewStateReducer(state, { type: 'close', key: 'slice:s-3' })
    expect(state.activeKey).toBe('slice:s-2')
    state = viewStateReducer(state, { type: 'close', key: 'slice:s-2' })
    expect(state.activeKey).toBe('slice:s-1')
    state = viewStateReducer(state, { type: 'close', key: 'slice:s-1' })
    expect(state.activeKey).toBeNull()
    expect(state.tabs).toEqual([])
  })

  it('closeForSlice drops both the focus and present tabs of one slice', () => {
    let state = viewStateReducer(base(), {
      type: 'open',
      tab: { kind: 'slice', sliceId: 's-1' },
    })
    state = viewStateReducer(state, {
      type: 'open',
      tab: { kind: 'present', sliceId: 's-1' },
    })
    state = viewStateReducer(state, { type: 'closeForSlice', sliceId: 's-1' })
    expect(state.tabs).toEqual([])
    expect(state.activeKey).toBeNull()
  })
})

describe('viewStateReducer boot resolution', () => {
  it('resolves a pending slice link once the list contains it', () => {
    let state = createInitialViewState('?slice=s-1')
    state = viewStateReducer(state, {
      type: 'resolvePending',
      availableSliceIds: ['s-1', 's-2'],
    })
    expect(state.pendingUrlState).toBeNull()
    expect(state.activeKey).toBe('slice:s-1')
  })

  it('a present link opens the present tab and restores its frame one-shot', () => {
    let state = createInitialViewState('?slice=s-1&mode=present&frame=3')
    state = viewStateReducer(state, {
      type: 'resolvePending',
      availableSliceIds: ['s-1'],
    })
    expect(state.activeKey).toBe('present:s-1')
    expect(state.restoredFrame).toEqual({ sliceId: 's-1', frame: 3 })
    state = viewStateReducer(state, { type: 'consumeRestoredFrame' })
    expect(state.restoredFrame).toBeNull()
  })

  it('a dead link stays on the base view and records the missing slice', () => {
    let state = createInitialViewState('?slice=gone')
    state = viewStateReducer(state, {
      type: 'resolvePending',
      availableSliceIds: ['s-1'],
    })
    expect(state.activeKey).toBeNull()
    expect(state.tabs).toEqual([])
    expect(state.missingSliceId).toBe('gone')
    state = viewStateReducer(state, { type: 'dismissMissingSlice' })
    expect(state.missingSliceId).toBeNull()
  })

  it('resolvePending is a no-op once nothing is pending', () => {
    const settled = viewStateReducer(createInitialViewState(''), {
      type: 'resolvePending',
      availableSliceIds: ['s-1'],
    })
    expect(settled.tabs).toEqual([])
    expect(settled.activeKey).toBeNull()
  })
})

describe('tabKey', () => {
  it('is stable per kind + slice', () => {
    expect(tabKey({ kind: 'slice', sliceId: 'a' })).toBe('slice:a')
    expect(tabKey({ kind: 'present', sliceId: 'a' })).toBe('present:a')
  })
})
