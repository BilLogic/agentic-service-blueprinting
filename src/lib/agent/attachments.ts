import { useSyncExternalStore } from 'react'

/**
 * The hand-off shelf between the canvas and the composer. Capturing
 * annotations (or anything else later) parks ONE pending attachment here;
 * the composer shows it as a removable attachment and folds `payload` into
 * the next message. Structure, not a screenshot — everything that travels can
 * be listed to the person sending it (see annotationCapture.ts).
 */
export type AgentAttachment = {
  kind: 'annotations'
  /** Attachment label, e.g. "3 marks on Intake Call". */
  label: string
  /** Human-readable lines shown in the attachment's tooltip / transcript. */
  lines: string[]
  /** The structured text the model receives. */
  payload: string
}

let pending: AgentAttachment | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function setPendingAgentAttachment(next: AgentAttachment | null) {
  pending = next
  emit()
}

export function takePendingAgentAttachment(): AgentAttachment | null {
  const taken = pending
  pending = null
  if (taken) emit()
  return taken
}

export function usePendingAgentAttachment(): AgentAttachment | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => pending,
  )
}
