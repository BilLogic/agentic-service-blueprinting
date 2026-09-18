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
  // question there was nothing to answer it with.
  //
  // FORGETTING THE LIST WORK ON THE WAY OUT BUYS TWO THINGS, AND NOT A THIRD.
  // It re-arms the ask, so the client that attaches next gets its own merge
  // rather than being told the list was already hydrated by a database it has
  // never seen. And it re-arms the outstanding answer, so a merge still on
  // the wire from the previous client cannot mark this one's ask settled and
  // drop the list's skeleton for a read that has not come back.
  //
  // What it does NOT do is stop the old flight. That merge is not cancelled:
  // it resumes with the previous database's rows, writes them into the list,
  // and pushes the local-only rows it computed back up through whichever
  // client is attached by then. Re-arming the ask is bookkeeping, not a
  // cancel, and an account switch mid-merge can still land the previous
  // account's sessions — tracked as its own change, since fixing it means
  // making the flight itself abortable and testing a cross-account path.
  //
  // The transcript work is deliberately NOT forgotten here. Its handle is per
  // session id, and a session id minted under one account does not name a row
  // the next account is allowed to read, so a re-ask would read nothing and
  // clear nothing: the events already in memory belong to the run, and only
  // forgetting the run drops those. Re-arming it would buy a wasted read and
  // a skeleton over a conversation still on screen.
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
