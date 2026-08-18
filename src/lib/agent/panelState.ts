import { useSyncExternalStore } from 'react'

/**
 * The agent panel's view state, held OUTSIDE the component.
 *
 * The chat has two postures (docked in the sidebar, floating over the
 * canvas) rendered by two mount points, so dragging between them unmounts
 * one `AgentPanel` and mounts another. Anything held in component state
 * dies in that gap — which meant a drag threw you back to the session
 * list and ate a half-typed message.
 *
 * Placement promises "same conversation either way"; the transcript
 * already lived in a module store, so this is the rest of that promise:
 * which session is open, and what you were typing in it.
 */
type PanelState = {
  openSessionId: string | null
  /** Per-session composer state — switching sessions keeps each draft. */
  drafts: Record<string, { text: string; skillId: string | null }>
}

const EMPTY_DRAFT = { text: '', skillId: null } as const

let state: PanelState = { openSessionId: null, drafts: {} }
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((listener) => listener())
}

export function setOpenAgentSession(sessionId: string | null): void {
  if (state.openSessionId === sessionId) return
  state = { ...state, openSessionId: sessionId }
  emit()
}

export function setAgentDraft(
  sessionId: string,
  draft: { text: string; skillId: string | null },
): void {
  const current = state.drafts[sessionId] ?? EMPTY_DRAFT
  if (current.text === draft.text && current.skillId === draft.skillId) return
  state = { ...state, drafts: { ...state.drafts, [sessionId]: draft } }
  emit()
}

export function clearAgentDraft(sessionId: string): void {
  if (!state.drafts[sessionId]) return
  const rest = { ...state.drafts }
  delete rest[sessionId]
  state = { ...state, drafts: rest }
  emit()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useOpenAgentSessionId(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => state.openSessionId,
    () => state.openSessionId,
  )
}

export function useAgentDraft(sessionId: string): {
  text: string
  skillId: string | null
} {
  return useSyncExternalStore(
    subscribe,
    () => state.drafts[sessionId] ?? EMPTY_DRAFT,
    () => EMPTY_DRAFT,
  )
}
