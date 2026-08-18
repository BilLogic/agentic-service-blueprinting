import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseClient, isSupabaseConfigured } from '../lib/supabase'
import type { Database } from '../types/database'

type SupabaseContextValue = {
  client: SupabaseClient<Database> | null
  configured: boolean
  session: Session | null
  isLoading: boolean
  /**
   * A signed-in session may hold the write tools. UX gate only — with the
   * service-tier recipe applied, the RPCs and RESTRICTIVE policies still
   * refuse a non-service session server-side.
   */
  canWrite: boolean
  /**
   * The agent loop may hold the write tools. Derived from the JWT's
   * app_metadata.role: no role claim means the tier recipe was never
   * adopted, so every signed-in session writes; an explicit non-'service'
   * role means the recipe IS in play and this session is a viewer — the
   * loop then produces its scripted view-only refusals instead of raw RLS
   * errors. UX gate only; the server stays the real enforcer.
   */
  canAgentWrite: boolean
  /** Agent persistence (sessions/transcripts in the DB) is possible. */
  canAgent: boolean
}

const SupabaseContext = createContext<SupabaseContextValue | null>(null)

type SupabaseProviderProps = {
  children: ReactNode
}

export function SupabaseProvider({ children }: SupabaseProviderProps) {
  const configured = isSupabaseConfigured()
  const client = useMemo(() => createSupabaseClient(), [])
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(configured)

  useEffect(() => {
    if (!client) {
      setIsLoading(false)
      return
    }

    let mounted = true

    client.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setIsLoading(false)
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

  const value = useMemo(() => {
    const canWrite = configured && session !== null
    // Contract: no role claim in the JWT = the tier recipe (20260818002000)
    // was never adopted = every signed-in session writes. Any explicit role
    // other than 'service' marks a viewer session under the recipe. This
    // only shapes the agent's UX — RLS/RPCs enforce for real server-side.
    const role = session?.user.app_metadata?.role as string | undefined
    return {
      client,
      configured,
      session,
      isLoading,
      canWrite,
      canAgentWrite: canWrite && (role == null || role === 'service'),
      canAgent: configured && session !== null,
    }
  }, [client, configured, session, isLoading])

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
