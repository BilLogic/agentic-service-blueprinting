import { useSyncExternalStore } from 'react'
import { sessionSnapshot, subscribeToSession } from '@/lib/authoringSession'

/**
 * Live count of ledger entries this agent session produced.
 *
 * Its own module rather than a second export beside `ChangeCount`: fast
 * refresh asks a module for components or for everything else, not both.
 */
export function useAgentChangeCount(sessionId: string): number {
  const changes = useSyncExternalStore(subscribeToSession, sessionSnapshot)
  return changes.filter((entry) => entry.agentSessionId === sessionId).length
}
