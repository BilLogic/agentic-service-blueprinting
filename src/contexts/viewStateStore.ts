import { createContext, useContext } from 'react'
import { parseUrlViewState, type UrlViewState } from '@/lib/urlViewState'

/**
 * Tab model for the editor shell — slice focus / presentation tabs layered
 * over the base blueprint view. The blueprint/home view is not a tab: it is
 * the base state, represented by `activeKey === null` (and shown whenever no
 * tab is active). Pure reducer + key helpers live here (unit-testable, no
 * React rendering); the provider that owns the reducer and URL sync is
 * `ViewStateContext.tsx`.
 */

export type TabDescriptor =
  | { kind: 'slice'; sliceId: string }
  | { kind: 'present'; sliceId: string }

export type TabKey = `slice:${string}` | `present:${string}`

export const tabKey = (t: TabDescriptor): TabKey => `${t.kind}:${t.sliceId}`

export type ViewStateAction =
  | { type: 'open'; tab: TabDescriptor }
  | { type: 'close'; key: TabKey }
  | { type: 'activate'; key: TabKey | null }
  | { type: 'closeForSlice'; sliceId: string }
  | { type: 'resolvePending'; availableSliceIds: readonly string[] }
  | { type: 'consumeRestoredFrame' }
  | { type: 'dismissMissingSlice' }

export type ViewState = {
  tabs: TabDescriptor[]
  /** Active tab key; `null` means the base blueprint view. */
  activeKey: TabKey | null
  /** Parsed boot URL, held until the slice list loads (never applied blind). */
  pendingUrlState: UrlViewState | null
  /** Frame restored from a `?mode=present&frame=` deep link. */
  restoredFrame: { sliceId: string; frame: number } | null
  /**
   * A deep link named a slice that does not exist (deleted, or another
   * workspace's). Surfaced as a dismissible notice — dropping straight to
   * the base view looks like the link simply did nothing.
   */
  missingSliceId: string | null
}

export function createInitialViewState(search: string): ViewState {
  return {
    tabs: [],
    activeKey: null,
    pendingUrlState: parseUrlViewState(search),
    restoredFrame: null,
    missingSliceId: null,
  }
}

/** Close a set of tab keys. */
function closeKeys(state: ViewState, keys: ReadonlySet<TabKey>): ViewState {
  if (keys.size === 0) return state

  const tabs = state.tabs.filter((tab) => !keys.has(tabKey(tab)))
  if (tabs.length === state.tabs.length) return state

  let activeKey = state.activeKey
  if (activeKey !== null && keys.has(activeKey)) {
    // Closing the active tab activates its nearest surviving left neighbor,
    // or falls back to the base blueprint view when none is left.
    const activeIndex = state.tabs.findIndex((tab) => tabKey(tab) === state.activeKey)
    activeKey = null
    for (let index = activeIndex - 1; index >= 0; index -= 1) {
      const candidate = state.tabs[index]
      if (candidate && !keys.has(tabKey(candidate))) {
        activeKey = tabKey(candidate)
        break
      }
    }
  }

  return { ...state, tabs, activeKey }
}

export function viewStateReducer(state: ViewState, action: ViewStateAction): ViewState {
  switch (action.type) {
    case 'open': {
      const key = tabKey(action.tab)
      if (state.tabs.some((tab) => tabKey(tab) === key)) {
        return state.activeKey === key ? state : { ...state, activeKey: key }
      }
      return { ...state, tabs: [...state.tabs, action.tab], activeKey: key }
    }
    case 'close':
      return closeKeys(state, new Set([action.key]))
    case 'activate': {
      if (action.key === state.activeKey) return state
      if (action.key !== null && !state.tabs.some((tab) => tabKey(tab) === action.key)) {
        return state
      }
      return { ...state, activeKey: action.key }
    }
    case 'closeForSlice':
      return closeKeys(
        state,
        new Set(
          state.tabs
            .filter((tab) => tab.sliceId === action.sliceId)
            .map(tabKey),
        ),
      )
    case 'resolvePending': {
      const pending = state.pendingUrlState
      if (pending === null) return state

      const cleared: ViewState = { ...state, pendingUrlState: null }
      if (pending.kind === 'blueprint') return cleared
      // The deep-linked slice never materialized — stay on the base view,
      // but say so rather than dropping the link on the floor.
      if (!action.availableSliceIds.includes(pending.sliceId)) {
        return { ...cleared, missingSliceId: pending.sliceId }
      }

      const tab: TabDescriptor =
        pending.kind === 'present'
          ? { kind: 'present', sliceId: pending.sliceId }
          : { kind: 'slice', sliceId: pending.sliceId }
      const opened = viewStateReducer(cleared, { type: 'open', tab })
      return pending.kind === 'present'
        ? { ...opened, restoredFrame: { sliceId: pending.sliceId, frame: pending.frame } }
        : opened
    }
    case 'consumeRestoredFrame':
      // One-shot: once the presentation has seeded its frame, drop the
      // deep-link frame so reopening a present tab starts at frame 0
      // instead of snapping back to the stale URL frame.
      return state.restoredFrame === null
        ? state
        : { ...state, restoredFrame: null }
    case 'dismissMissingSlice':
      return state.missingSliceId === null
        ? state
        : { ...state, missingSliceId: null }
  }
}

export type ViewStateContextValue = {
  tabs: TabDescriptor[]
  activeKey: TabKey | null
  /** Active tab descriptor; `null` means the base blueprint view. */
  activeTab: TabDescriptor | null
  pendingUrlState: UrlViewState | null
  restoredFrame: { sliceId: string; frame: number } | null
  /** Slice id from a deep link that resolved to nothing; null once dismissed. */
  missingSliceId: string | null
  /** Dismiss the missing-slice notice. */
  dismissMissingSlice: () => void
  openTab: (tab: TabDescriptor) => void
  closeTab: (key: TabKey) => void
  /** Activate a tab, or pass `null` to return to the base blueprint view. */
  activateTab: (key: TabKey | null) => void
  closeTabsForSlice: (sliceId: string) => void
  /** Activate a pending URL deep link once the slice list has loaded. */
  resolvePending: (availableSliceIds: readonly string[]) => void
  /** Clear `restoredFrame` after the presentation reads it (one-shot). */
  consumeRestoredFrame: () => void
  /** Presentation frame changes mirror to the URL (debounced). */
  reportPresentFrame: (frame: number) => void
}

export const ViewStateContext = createContext<ViewStateContextValue | null>(null)

export function useViewState(): ViewStateContextValue {
  const context = useContext(ViewStateContext)
  if (!context) {
    throw new Error('useViewState must be used within ViewStateProvider')
  }
  return context
}
