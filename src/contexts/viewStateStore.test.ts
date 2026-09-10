import { describe, expect, it } from 'vitest'
import {
  createInitialViewState,
  isBaseViewCurrent,
  tabKey,
  viewStateReducer,
  warmMounts,
  type ViewState,
} from '@/contexts/viewStateStore'

// Reducer tests for the slice tab store:
// boot deep links are held as pendingUrlState and only applied against the
// loaded slice list; closing the active tab activates its left neighbor;
// a dead deep link surfaces as a dismissible missing-slice notice.

const base = (): ViewState => createInitialViewState('')

/** Open each slice in order; the last one is active. */
function openSlices(ids: readonly string[]): ViewState {
  let state = base()
  for (const sliceId of ids) {
    state = viewStateReducer(state, {
      type: 'open',
      tab: { kind: 'slice', sliceId },
    })
  }
  return state
}

describe('createInitialViewState', () => {
  it('boots with no tabs and no pending state for a bare URL', () => {
    const state = createInitialViewState('')
    expect(state.tabs).toEqual([])
    expect(state.activeKey).toBeNull()
    expect(state.pendingUrlState).toBeNull()
    expect(state.missingSliceId).toBeNull()
    expect(state.sliceActivationRecency).toEqual([])
  })

  it('holds a ?slice= boot link as pending, never applied blind', () => {
    const state = createInitialViewState('?slice=s-1')
    expect(state.pendingUrlState).toEqual({ kind: 'slice', sliceId: 's-1' })
    expect(state.tabs).toEqual([])
  })

  it('holds a present link with its slide', () => {
    const state = createInitialViewState('?slice=s-1&mode=present&slide=2')
    expect(state.pendingUrlState).toEqual({
      kind: 'present',
      sliceId: 's-1',
      slide: 2,
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

  it('a present link opens the present tab and restores its slide one-shot', () => {
    let state = createInitialViewState('?slice=s-1&mode=present&slide=3')
    state = viewStateReducer(state, {
      type: 'resolvePending',
      availableSliceIds: ['s-1'],
    })
    expect(state.activeKey).toBe('present:s-1')
    expect(state.restoredSlide).toEqual({ sliceId: 's-1', slide: 3 })
    state = viewStateReducer(state, { type: 'consumeRestoredSlide' })
    expect(state.restoredSlide).toBeNull()
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

describe('slice activation recency', () => {
  it('records last activation, not strip order', () => {
    let state = openSlices(['s-1', 's-2', 's-3'])
    expect(state.sliceActivationRecency).toEqual([
      'slice:s-1',
      'slice:s-2',
      'slice:s-3',
    ])
    state = viewStateReducer(state, { type: 'activate', key: 'slice:s-1' })
    expect(state.sliceActivationRecency).toEqual([
      'slice:s-2',
      'slice:s-3',
      'slice:s-1',
    ])
  })

  it('drops a closed slice from recency', () => {
    let state = openSlices(['s-1', 's-2'])
    state = viewStateReducer(state, { type: 'close', key: 'slice:s-1' })
    expect(state.sliceActivationRecency).toEqual(['slice:s-2'])
  })
})

describe('warmMounts', () => {
  it('keeps every open slice warm when two are open', () => {
    const state = openSlices(['s-1', 's-2'])
    const mounts = warmMounts({
      tabs: state.tabs,
      activeKey: state.activeKey,
      sessionMountedBase: false,
      sliceActivationRecency: state.sliceActivationRecency,
    })
    expect(mounts.baseWarm).toBe(false)
    expect([...mounts.sliceKeys].sort()).toEqual(['slice:s-1', 'slice:s-2'])
  })

  it('does not mark the base canvas warm until this session mounted it', () => {
    const state = openSlices(['s-1'])
    expect(
      warmMounts({
        tabs: state.tabs,
        activeKey: state.activeKey,
        sessionMountedBase: false,
        sliceActivationRecency: state.sliceActivationRecency,
      }).baseWarm,
    ).toBe(false)
    expect(
      warmMounts({
        tabs: state.tabs,
        activeKey: state.activeKey,
        sessionMountedBase: true,
        sliceActivationRecency: state.sliceActivationRecency,
      }).baseWarm,
    ).toBe(true)
  })

  it('does not mark the base canvas warm while a slice URL is still pending', () => {
    const state = createInitialViewState('?slice=s-1')
    expect(isBaseViewCurrent({ activeKey: state.activeKey, pendingUrl: true })).toBe(
      false,
    )
    expect(
      warmMounts({
        tabs: state.tabs,
        activeKey: state.activeKey,
        sessionMountedBase: false,
        sliceActivationRecency: state.sliceActivationRecency,
      }).baseWarm,
    ).toBe(false)
  })

  it('treats a null active key as the base view once the URL has settled', () => {
    expect(isBaseViewCurrent({ activeKey: null, pendingUrl: false })).toBe(true)
    expect(
      isBaseViewCurrent({ activeKey: 'slice:s-1', pendingUrl: false }),
    ).toBe(false)
  })

  it('keeps the current slice plus five other hidden slice trees', () => {
    const state = openSlices(['s-1', 's-2', 's-3', 's-4', 's-5', 's-6', 's-7'])
    const mounts = warmMounts({
      tabs: state.tabs,
      activeKey: state.activeKey,
      sessionMountedBase: false,
      sliceActivationRecency: state.sliceActivationRecency,
    })
    expect(mounts.sliceKeys).toContain('slice:s-7')
    expect(mounts.sliceKeys).not.toContain('slice:s-1')
    expect(mounts.sliceKeys).toHaveLength(6)
  })

  it('on the base view keeps at most five slice trees', () => {
    let state = openSlices(['s-1', 's-2', 's-3', 's-4', 's-5', 's-6', 's-7', 's-8'])
    state = viewStateReducer(state, { type: 'activate', key: null })
    const mounts = warmMounts({
      tabs: state.tabs,
      activeKey: state.activeKey,
      sessionMountedBase: true,
      sliceActivationRecency: state.sliceActivationRecency,
    })
    expect(mounts.baseWarm).toBe(true)
    expect(mounts.sliceKeys).toHaveLength(5)
    expect(mounts.sliceKeys).not.toContain('slice:s-1')
    expect(mounts.sliceKeys).not.toContain('slice:s-2')
    expect(mounts.sliceKeys).not.toContain('slice:s-3')
  })

  it('never makes the current slice cold', () => {
    let state = openSlices(['s-1', 's-2', 's-3', 's-4', 's-5', 's-6'])
    state = viewStateReducer(state, { type: 'activate', key: 'slice:s-1' })
    const mounts = warmMounts({
      tabs: state.tabs,
      activeKey: state.activeKey,
      sessionMountedBase: false,
      sliceActivationRecency: state.sliceActivationRecency,
    })
    expect(mounts.sliceKeys).toContain('slice:s-1')
  })

  it('evicts by last activation, not strip order', () => {
    let state = openSlices(['s-1', 's-2', 's-3', 's-4', 's-5', 's-6', 's-7'])
    state = viewStateReducer(state, { type: 'activate', key: 'slice:s-1' })
    state = viewStateReducer(state, { type: 'activate', key: 'slice:s-2' })
    const mounts = warmMounts({
      tabs: state.tabs,
      activeKey: state.activeKey,
      sessionMountedBase: false,
      sliceActivationRecency: state.sliceActivationRecency,
    })
    expect(mounts.sliceKeys).toContain('slice:s-2')
    expect(mounts.sliceKeys).toContain('slice:s-1')
    expect(mounts.sliceKeys).not.toContain('slice:s-3')
  })

  it('does not let an open present consume a slice slot', () => {
    let state = openSlices(['s-1', 's-2', 's-3', 's-4', 's-5', 's-6', 's-7'])
    state = viewStateReducer(state, {
      type: 'open',
      tab: { kind: 'present', sliceId: 's-7' },
    })
    const mounts = warmMounts({
      tabs: state.tabs,
      activeKey: state.activeKey,
      sessionMountedBase: false,
      sliceActivationRecency: state.sliceActivationRecency,
    })
    expect(mounts.presentKeys).toEqual(['present:s-7'])
    expect(mounts.sliceKeys).toHaveLength(5)
    expect(mounts.sliceKeys).toContain('slice:s-7')
  })

  it('keeps present mounted on another view without shrinking the slice set', () => {
    let state = openSlices(['s-1', 's-2', 's-3', 's-4', 's-5', 's-6', 's-7'])
    state = viewStateReducer(state, {
      type: 'open',
      tab: { kind: 'present', sliceId: 's-7' },
    })
    state = viewStateReducer(state, { type: 'activate', key: 'slice:s-7' })
    const mounts = warmMounts({
      tabs: state.tabs,
      activeKey: state.activeKey,
      sessionMountedBase: false,
      sliceActivationRecency: state.sliceActivationRecency,
    })
    expect(mounts.presentKeys).toEqual(['present:s-7'])
    expect(mounts.sliceKeys).toHaveLength(6)
    expect(mounts.sliceKeys).toContain('slice:s-7')
  })

  it('drops a closed slice from the warm set', () => {
    let state = openSlices(['s-1', 's-2'])
    state = viewStateReducer(state, { type: 'close', key: 'slice:s-1' })
    const mounts = warmMounts({
      tabs: state.tabs,
      activeKey: state.activeKey,
      sessionMountedBase: false,
      sliceActivationRecency: state.sliceActivationRecency,
    })
    expect(mounts.sliceKeys).toEqual(['slice:s-2'])
  })
})
