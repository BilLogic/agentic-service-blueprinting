import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import {
  createSupabaseClient,
  devLoginCredentials,
  hasDevAuthoringKey,
  hasDevAuthoringUi,
  isSupabaseConfigured,
} from '../lib/supabase'
import type { Database } from '../types/database'
import { hasKey, useAgentSettings } from '../lib/agent/settings'
import {
  applyDevSimulation,
  useDevSimulation,
  type DevSimulation,
} from '../lib/devPortal'

type SupabaseContextValue = {
  client: SupabaseClient<Database> | null
  configured: boolean
  session: Session | null
  isLoading: boolean
  /**
   * Visibility hint for mutation UI (hidden — never disabled — when false).
   * RLS is the authority; this only reflects whether this session has any
   * chance of a write succeeding: a signed-in user, or a dev server holding
   * the local authoring key. A deployed visitor is neither.
   */
  canWrite: boolean
  /** Writing with the local authoring key rather than as a signed-in user. */
  isDevAuthoring: boolean
  /**
   * Showing the authoring UI on a dev server that cannot actually write.
   * Distinct from `isDevAuthoring`, and the two must never share a badge: one
   * means "your writes reach the live database", the other means "they will
   * not". Getting those the wrong way round is the expensive mistake.
   */
  isEditPreview: boolean
  /**
   * This session holds the editing tier: either the optional service-account
   * recipe is not applied (no role claim) or it is and this account carries
   * app_metadata.role === 'service' (set server-side; RLS's restrictive
   * policies are the authority — this mirrors them for the UI).
   * Sessions outside the tier view and use the agent read-only.
   */
  isServiceAccount: boolean
  /** Any signed-in session may open the agent (viewers chat read-only). */
  canAgent: boolean
  /**
   * Does the agent get WRITE tools this send? `canWrite` minus the
   * no-database trial, where there is no database to write to and the write
   * specs are never registered.
   */
  canAgentWrite: boolean
  /**
   * No Supabase configured, but the user has an agent key: the panel opens
   * read-only against the bundled sample blueprint.
   */
  isSampleTrial: boolean
  /** Developer-portal tier simulation — client-side UI gating only. */
  devSimulation: DevSimulation
  /** The write flag BEFORE the simulation, for the honest readout. */
  realCanWrite: boolean
}

const SupabaseContext = createContext<SupabaseContextValue | null>(null)

type SupabaseProviderProps = {
  children: ReactNode
}

/*
 * Module singleton, not useMemo: StrictMode's double render re-runs memo
 * initializers, and two GoTrueClients on one storage key is undefined
 * behavior (and a console warning on every load). One client per page is
 * the actual contract — same reasoning as lib/queryClient.ts.
 */
const sharedClient = createSupabaseClient()

export function SupabaseProvider({ children }: SupabaseProviderProps) {
  const configured = isSupabaseConfigured()
  const client = sharedClient
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(configured)

  useEffect(() => {
    if (!client) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot resolution of the initial loading gate when Supabase is unconfigured; the async auth sync below is the real work
      setIsLoading(false)
      return
    }

    let mounted = true

    client.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setIsLoading(false)
      // Roles live in the JWT, which is minted at sign-in — a session that
      // predates a role change carries stale claims until refresh. One
      // refresh per boot keeps app_metadata.role current for long-lived
      // sessions (onAuthStateChange delivers the updated session).
      if (data.session) void client.auth.refreshSession()
    })

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [client])

  /*
    Dev sign-in. A real session through the front door: `signInWithPassword`
    against a dev account, so RLS sees `authenticated` exactly as it would
    for any user. This is the sanctioned alternative to the service key —
    the key bypasses policy; this obeys it.

    Runs once per boot, only in DEV, only when the pair is configured, and
    only when no session already exists (a persisted session from the last
    boot wins). Failure downgrades to read-only and logs — same behavior as
    having no credentials at all.
  */
  useEffect(() => {
    if (!client || isLoading || session) return
    const credentials = devLoginCredentials()
    if (!credentials) return
    let cancelled = false
    void client.auth
      .signInWithPassword(credentials)
      .then(({ error }) => {
        if (!cancelled && error) {
          console.error('[dev-login] sign-in failed:', error.message)
        }
      })
    return () => {
      cancelled = true
    }
  }, [client, isLoading, session])

  const isDevAuthoring = hasDevAuthoringKey()
  // Only ever true on a dev server, and never while anything can actually
  // write — a session that saves for real is not a preview of one, and the
  // "nothing saves" chip lying over working saves would be worse than either
  // state alone.
  const isEditPreview =
    hasDevAuthoringUi() && !isDevAuthoring && session === null

  /*
   * Contract with supabase/migrations/20260818002000_service_account_tier —
   * an OPTIONAL recipe. NO role claim in the JWT means the recipe was never
   * adopted, so every signed-in session edits (the template default); an
   * explicit role other than 'service' means the recipe IS in play and this
   * session is a viewer. Reading a missing claim as "not a service account"
   * would lock every adopter who skipped the recipe out of their own data.
   *
   * UX gate only — the RESTRICTIVE policies and RPC guards are the wall.
   */
  const sessionRole = (
    session?.user.app_metadata as { role?: string } | undefined
  )?.role
  const isServiceAccount =
    (session !== null && (sessionRole == null || sessionRole === 'service')) ||
    isDevAuthoring

  const realCanWrite =
    configured &&
    ((session !== null && isServiceAccount) || isDevAuthoring || isEditPreview)

  /*
   * No-database trial. With nothing configured, the canvas already renders
   * the bundled sample blueprint — the agent used to be the one surface that
   * simply did not exist there, even though its read tools can answer from
   * that same sample (the eval harness runs exactly that way). A provider key
   * is the whole entry condition; the panel opens read-only.
   */
  const agentSettings = useAgentSettings()
  const isSampleTrial = !configured && hasKey(agentSettings)

  /*
   * Developer portal. Client-side ONLY: it moves what the UI believes about
   * this session's tier and touches no policy. RLS and the RPC grants are
   * unchanged and remain the authority — see lib/devPortal.ts.
   */
  const devSimulation = useDevSimulation()
  const canWrite = applyDevSimulation(devSimulation, realCanWrite)

  const value = useMemo(
    () => ({
      client,
      configured,
      session,
      isLoading,
      canWrite,
      realCanWrite,
      canAgentWrite: canWrite && !isSampleTrial,
      isDevAuthoring,
      isEditPreview,
      isServiceAccount,
      canAgent:
        isSampleTrial || (configured && (session !== null || isDevAuthoring)),
      isSampleTrial,
      devSimulation,
    }),
    [
      client,
      configured,
      session,
      isLoading,
      canWrite,
      realCanWrite,
      isDevAuthoring,
      isEditPreview,
      isSampleTrial,
      isServiceAccount,
      devSimulation,
    ],
  )

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase(): SupabaseContextValue {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within SupabaseProvider')
  }
  return context
}
