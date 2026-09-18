import { useEffect } from 'react'
import { AgentChatView } from '@/components/editor/agent/AgentChatView'
import { AgentSessionsView } from '@/components/editor/agent/AgentSessionsView'
import { useSupabase } from '@/contexts/SupabaseProvider'
import {
  attachAgentPersistence,
  forgetAgentPersistenceWork,
} from '@/lib/agent/persistenceReadiness'
import {
  AGENT_SESSION_LIST_WORK,
  closeAgentSession,
  createAgentSession,
  hydrateAgentSessions,
  openAgentSession,
  useAgentSessions,
  useOpenAgentSession,
} from '@/lib/agent/sessions'

/**
 * The ✦ surface: two views, one at a time — session info never crowds the
 * conversation. Step 1 picks (or creates) a session; step 2 is the chat,
 * full height.
 */
export function AgentPanel() {
  const sessions = useAgentSessions()
  // Which session is open lives outside the component, in the session module
  // with the list it names: both postures mount their own AgentPanel, and
  // toggling ✦ unmounts it entirely — local state would drop you back to the
  // session list every time. Resolving the open id against the list is that
  // module's business too, so a session that has been deleted is closed
  // there rather than falling back to null here.
  const openSession = useOpenAgentSession()
  const { client, canAgent } = useSupabase()

  // Persistence rides the authenticated client: locally everything lands in
  // agent_sessions/agent_messages (viewers included — chat is their whole
  // surface); anonymous visitors stay on localStorage.
  //
  // The merge is ASKED FOR unconditionally and scheduled by the readiness
  // module, the same way the chat view asks for its transcript: with no
  // client it parks and the list stays local, and the ask is not spent on a
  // question there was nothing to answer it with. Forgetting it on the way
  // out is what keeps a client change honest — a different client is a
  // different database's answer, and the merge that ran against the old one
  // is not the answer for the new one.
  useEffect(() => {
    attachAgentPersistence(canAgent ? client : null)
    hydrateAgentSessions()
    return () => {
      attachAgentPersistence(null)
      forgetAgentPersistenceWork(AGENT_SESSION_LIST_WORK)
    }
  }, [canAgent, client])

  return openSession ? (
    <AgentChatView session={openSession} onBack={closeAgentSession} />
  ) : (
    <AgentSessionsView
      sessions={sessions}
      onOpen={openAgentSession}
      onCreate={() => {
        // ＋ drops straight into the conversation.
        openAgentSession(createAgentSession().id)
      }}
    />
  )
}
