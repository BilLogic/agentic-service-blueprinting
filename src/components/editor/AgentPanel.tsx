import { useEffect } from 'react'
import { AgentChatView } from '@/components/editor/agent/AgentChatView'
import { AgentSessionsView } from '@/components/editor/agent/AgentSessionsView'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { attachAgentPersistence } from '@/lib/agent/persistence'
import {
  setOpenAgentSession,
  useOpenAgentSessionId,
} from '@/lib/agent/panelState'
import {
  createAgentSession,
  hydrateAgentSessions,
  useAgentSessions,
} from '@/lib/agent/sessions'

/**
 * The ✦ surface: two views, one at a time — session info never crowds the
 * conversation. Step 1 picks (or creates) a session; step 2 is the chat,
 * full height.
 */
export function AgentPanel() {
  const sessions = useAgentSessions()
  // Panel view state lives outside the component: both postures mount
  // their own AgentPanel, and toggling ✦ unmounts it entirely — local
  // state would drop you back to the session list every time.
  const openSessionId = useOpenAgentSessionId()
  const { client, canAgent } = useSupabase()

  // Persistence rides the authenticated client: locally everything lands in
  // agent_sessions/agent_messages (viewers included — chat is their whole
  // surface); anonymous visitors stay on localStorage.
  useEffect(() => {
    attachAgentPersistence(canAgent ? client : null)
    if (canAgent && client) void hydrateAgentSessions()
    return () => attachAgentPersistence(null)
  }, [canAgent, client])

  const openSession =
    openSessionId !== null
      ? (sessions.find((session) => session.id === openSessionId) ?? null)
      : null

  return openSession ? (
    <AgentChatView
      session={openSession}
      onBack={() => setOpenAgentSession(null)}
    />
  ) : (
    <AgentSessionsView
      sessions={sessions}
      onOpen={(id) => setOpenAgentSession(id)}
      onCreate={() => {
        const session = createAgentSession()
        // ＋ drops straight into the conversation.
        setOpenAgentSession(session.id)
      }}
    />
  )
}

