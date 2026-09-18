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
  const { client, canAgent, session } = useSupabase()
  // WHICH ACCOUNT THE LIST IS BEING READ FOR — and the reason the effect
  // below is keyed on it rather than on the client alone. The client is a
  // module singleton whose identity never changes, and `canAgent` is a
  // boolean that is true on both sides of a switch, so neither of them moves
  // when one signed-in account replaces another. That replacement arrives
  // with no signed-out moment in between whenever a magic link mailed for one
  // account is opened in a tab signed in as another (`emailRedirectTo` is
  // this origin) or a password sign-in runs while a session is already live:
  // `onAuthStateChange` publishes a new non-null session and the token behind
  // the singleton is somebody else's from then on.
  //
  // The USER ID rather than the session object: a refresh mints a new session
  // for the same person roughly hourly, and keying on that would detach
  // persistence, re-arm the ask and re-read the whole list for an event that
  // moved nobody's rows. The id moves exactly when the account does, which is
  // exactly when the list on screen is the wrong person's.
  const accountId = session?.user.id ?? null

  // Persistence rides the authenticated client: locally everything lands in
  // agent_sessions/agent_messages (viewers included — chat is their whole
  // surface); anonymous visitors stay on localStorage.
  //
  // The merge is ASKED FOR unconditionally and scheduled by the readiness
  // module, the same way the chat view asks for its transcript: with no
  // client it parks and the list stays local, and the ask is not spent on a
  // question there was nothing to answer it with.
  //
  // FORGETTING THE LIST WORK ON THE WAY OUT BUYS THREE THINGS. It re-arms the
  // ask, so the client that attaches next gets its own merge rather than being
  // told the list was already hydrated by a database it has never seen. It
  // re-arms the outstanding answer, so a merge still on the wire from the
  // previous client cannot mark this one's ask settled and drop the list's
  // skeleton for a read that has not come back. And — the one that matters to
  // the person, not the surface — it supersedes that merge's flight, which the
  // merge itself consults before it writes: a read that comes back after the
  // switch publishes nothing and upserts nothing, so the signed-out account's
  // sessions never land over the new account's list and its rows are never
  // pushed into the new account's table.
  //
  // The transcript work is deliberately NOT forgotten here, and the reason is
  // NOT that RLS protects it — a read already on the wire under the previous
  // account's token comes back whatever the next account may read. The reason
  // is what that read does with its rows: `readTranscript` writes them into
  // the in-process run and nowhere else. Nothing durable, nothing another
  // account's table receives — the worst an abandoned transcript read can do
  // is put a conversation in memory that the next open of that session id
  // would have to ask for anyway. Re-arming it would buy a wasted read and a
  // skeleton over a conversation still on screen, and the events already in
  // memory belong to the run, which only forgetting the run drops.
  useEffect(() => {
    attachAgentPersistence(canAgent ? client : null)
    hydrateAgentSessions()
    return () => {
      attachAgentPersistence(null)
      forgetAgentPersistenceWork(AGENT_SESSION_LIST_WORK)
    }
  }, [canAgent, client, accountId])

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
