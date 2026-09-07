import { useSyncExternalStore } from 'react'
import { AGENT_FLOAT_DEFAULT, AGENT_FLOAT_MIN } from '@/lib/layoutTokens'
import { storageKey } from '@/lib/storageNamespace'

/**
 * Where the agent chat lives — and the fact that it is ONE surface with two
 * postures, not two features.
 *
 * `docked` puts it under the active sidebar panel (chat while the blueprint
 * nav or the slice list stays in view — the posture people actually work
 * in). `floating` lifts it over the canvas so it can sit beside the cells
 * being discussed. Dragging the chat's header out of the sidebar floats it;
 * dragging it back over the sidebar re-docks it. Same conversation either
 * way — placement never touches session state.
 */
export type AgentPlacementMode = 'docked' | 'floating'

export type AgentPlacement = {
  mode: AgentPlacementMode
  /** Is the agent showing at all (the rail's ✦ toggles this). */
  open: boolean
  /** Docked height as a fraction of the sidebar column. */
  dockRatio: number
  /** Floating window box, viewport pixels. */
  float: { x: number; y: number; width: number; height: number }
}

const STORAGE_KEY = storageKey('agent-placement')

export const DOCK_MIN_RATIO = 0.2
export const DOCK_MAX_RATIO = 0.8

const DEFAULTS: AgentPlacement = {
  mode: 'docked',
  open: false,
  dockRatio: 0.5,
  // Spread: the token is readonly; AgentPlacement.float is not.
  float: { ...AGENT_FLOAT_DEFAULT },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function load(): AgentPlacement {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<AgentPlacement>
    const float = { ...DEFAULTS.float, ...(parsed.float ?? {}) }
    return {
      mode: parsed.mode === 'floating' ? 'floating' : 'docked',
      open: parsed.open === true,
      dockRatio: clamp(
        typeof parsed.dockRatio === 'number' ? parsed.dockRatio : DEFAULTS.dockRatio,
        DOCK_MIN_RATIO,
        DOCK_MAX_RATIO,
      ),
      float: {
        // Clamped on load, not just on resize: a box saved on a wide
        // monitor would otherwise open offscreen on a laptop, and the
        // resize listener never fires to rescue it.
        x: Number.isFinite(float.x)
          ? clamp(float.x, 8, Math.max(8, window.innerWidth - 120))
          : DEFAULTS.float.x,
        y: Number.isFinite(float.y)
          ? clamp(float.y, 8, Math.max(8, window.innerHeight - 80))
          : DEFAULTS.float.y,
        width: Math.max(AGENT_FLOAT_MIN.width, float.width),
        height: Math.max(AGENT_FLOAT_MIN.height, float.height),
      },
    }
  } catch {
    return { ...DEFAULTS }
  }
}

let state: AgentPlacement = typeof window === 'undefined' ? { ...DEFAULTS } : load()
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((listener) => listener())
}

/**
 * Persistence is deliberately NOT part of `emit`: a drag emits on every
 * pointermove, and a synchronous JSON.stringify + localStorage write per
 * frame is a real cost for a value nobody reads until the next boot.
 * Callers flush at the end of a gesture (and any non-drag change flushes
 * immediately, since those are rare).
 */
export function persistAgentPlacement(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Placement memory is a nicety; failing to store is fine.
  }
}

export function setAgentPlacement(
  patch: Partial<AgentPlacement>,
  options?: { persist?: boolean },
): void {
  const next = {
    ...state,
    ...patch,
    float: { ...state.float, ...(patch.float ?? {}) },
  }
  if (
    next.mode === state.mode &&
    next.open === state.open &&
    next.dockRatio === state.dockRatio &&
    next.float.x === state.float.x &&
    next.float.y === state.float.y &&
    next.float.width === state.float.width &&
    next.float.height === state.float.height
  ) {
    return
  }
  state = next
  emit()
  if (options?.persist !== false) persistAgentPlacement()
}

/**
 * The live drag, shared by both mount points.
 *
 * The chat renders from two places (docked in the sidebar, floating over
 * the canvas) and a drag-out flips which one is visible MID-GESTURE. Held
 * as component state, the gesture would belong to the instance that is
 * about to hide — which is why the drop-target ring never appeared on a
 * drag-out. Transient by design: never persisted.
 */
export type AgentDragState = { active: boolean; overSidebar: boolean }

let drag: AgentDragState = { active: false, overSidebar: false }
const dragListeners = new Set<() => void>()

export function setAgentDrag(next: AgentDragState): void {
  if (drag.active === next.active && drag.overSidebar === next.overSidebar)
    return
  drag = next
  dragListeners.forEach((listener) => listener())
}

export function getAgentDrag(): AgentDragState {
  return drag
}

export function useAgentDrag(): AgentDragState {
  return useSyncExternalStore(
    (listener) => {
      dragListeners.add(listener)
      return () => dragListeners.delete(listener)
    },
    () => drag,
    () => drag,
  )
}

/** The rail's ✦: show/hide the agent wherever it currently lives. */
export function toggleAgentOpen(force?: boolean): void {
  setAgentPlacement({ open: force ?? !state.open })
}

/** Drag ended over the sidebar — dock it back. */
export function dockAgent(): void {
  setAgentPlacement({ mode: 'docked', open: true })
}

export function useAgentPlacement(): AgentPlacement {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
    () => state,
  )
}
