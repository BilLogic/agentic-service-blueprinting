import { useSyncExternalStore } from 'react'
import { sessionSnapshot, subscribeToSession } from '@/lib/authoringSession'

/** Live count of ledger entries this agent session produced. */
export function useAgentChangeCount(sessionId: string): number {
  const changes = useSyncExternalStore(subscribeToSession, sessionSnapshot)
  return changes.filter((entry) => entry.agentSessionId === sessionId).length
}
