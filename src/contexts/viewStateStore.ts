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
  | { type: 'consumeRestoredSlide' }
  | { type: 'dismissMissingSlice' }

export type ViewState = {
  tabs: TabDescriptor[]
  /** Active tab key; `null` means the base blueprint view. */
  activeKey: TabKey | null
  /**
   * Open slice keys in activation order, oldest first. Present keys are
   * never stored here — they do not take a warm-set slot.
   */
  sliceActivationRecency: TabKey[]
  /** Parsed boot URL, held until the slice list loads (never applied blind). */
  pendingUrlState: UrlViewState | null
  /** Slide restored from a `?mode=present&slide=` deep link. */
  restoredSlide: { sliceId: string; slide: number } | null
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
    sliceActivationRecency: [],
    pendingUrlState: parseUrlViewState(search),
    restoredSlide: null,
    missingSliceId: null,
  }
}

/** How many hidden slice trees may stay mounted besides the current view. */
export const HIDDEN_SLICE_WARM_LIMIT = 5

export type WarmMounts = {
  /**
   * True once this session has mounted the base canvas. The shell also
   * mounts the base view when it is current, even if this is still false.
   */
  baseWarm: boolean
  sliceKeys: TabKey[]
  presentKeys: TabKey[]
}

/**
 * True when the reader is on the base canvas — no tab, no unresolved deep link.
 *
 * @param input.activeKey - the active tab, or null on the base view
 * @param input.pendingUrl - a boot URL is still unresolved
 */
export function isBaseViewCurrent(input: {
  activeKey: TabKey | null
  pendingUrl: boolean
}): boolean {
  return input.activeKey === null && !input.pendingUrl
}

/**
 * Which open views stay mounted. The current view is always included;
 * hidden slices are the least-recently activated working set.
 *
 * @param input.sessionMountedBase - the reader has already opened the base canvas this session
 */
export function warmMounts(input: {
  tabs: TabDescriptor[]
  activeKey: TabKey | null
  sessionMountedBase: boolean
  sliceActivationRecency: TabKey[]
}): WarmMounts {
  const presentKeys = input.tabs
    .filter((tab) => tab.kind === 'present')
    .map(tabKey)
  const sliceKeysAll = input.tabs
    .filter((tab) => tab.kind === 'slice')
    .map(tabKey)
  const currentSlice =
    input.activeKey !== null && input.activeKey.startsWith('slice:')
      ? input.activeKey
      : null
  const hidden = sliceKeysAll.filter((key) => key !== currentSlice)
  const recencyKnown = input.sliceActivationRecency.filter((key) =>
    hidden.includes(key),
  )
  const unknown = hidden.filter(
    (key) => !input.sliceActivationRecency.includes(key),
  )
  const recencyOfHidden = [...unknown, ...recencyKnown]
  const warmHidden = recencyOfHidden.slice(-HIDDEN_SLICE_WARM_LIMIT)
  const sliceKeys = currentSlice
    ? [...new Set([...warmHidden, currentSlice])]
    : warmHidden
  return {
    baseWarm: input.sessionMountedBase,
    sliceKeys,
    presentKeys,
  }
}

/** Move a slice key to the newest end of recency. Present keys are ignored. */
function touchSliceRecency(state: ViewState, key: TabKey | null): ViewState {
  if (key === null || !key.startsWith('slice:')) return state
  const sliceActivationRecency = [
    ...state.sliceActivationRecency.filter((item) => item !== key),
    key,
  ]
  return { ...state, sliceActivationRecency }
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

  return {
    ...state,
    tabs,
    activeKey,
    sliceActivationRecency: state.sliceActivationRecency.filter(
      (key) => !keys.has(key),
    ),
  }
}

export function viewStateReducer(state: ViewState, action: ViewStateAction): ViewState {
  switch (action.type) {
    case 'open': {
      const key = tabKey(action.tab)
      if (state.tabs.some((tab) => tabKey(tab) === key)) {
        if (state.activeKey === key) return state
        return touchSliceRecency({ ...state, activeKey: key }, key)
      }
      return touchSliceRecency(
        { ...state, tabs: [...state.tabs, action.tab], activeKey: key },
        key,
      )
    }
    case 'close':
      return closeKeys(state, new Set([action.key]))
    case 'activate': {
      if (action.key === state.activeKey) return state
      if (action.key !== null && !state.tabs.some((tab) => tabKey(tab) === action.key)) {
        return state
      }
      return touchSliceRecency({ ...state, activeKey: action.key }, action.key)
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
        ? { ...opened, restoredSlide: { sliceId: pending.sliceId, slide: pending.slide } }
        : opened
    }
    case 'consumeRestoredSlide':
      // One-shot: once the presentation has seeded its slide, drop the
      // deep-link slide so reopening a present tab starts at slide 0
      // instead of snapping back to the stale URL slide.
      return state.restoredSlide === null
        ? state
        : { ...state, restoredSlide: null }
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
  /** Open slice keys, oldest activation first. */
  sliceActivationRecency: TabKey[]
  pendingUrlState: UrlViewState | null
  restoredSlide: { sliceId: string; slide: number } | null
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
  /** Clear `restoredSlide` after the presentation reads it (one-shot). */
  consumeRestoredSlide: () => void
  /** Presentation slide changes mirror to the URL (debounced). */
  reportPresentSlide: (slide: number) => void
}

export const ViewStateContext = createContext<ViewStateContextValue | null>(null)

export function useViewState(): ViewStateContextValue {
  const context = useContext(ViewStateContext)
  if (!context) {
    throw new Error('useViewState must be used within ViewStateProvider')
  }
  return context
}
