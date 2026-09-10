import { useMemo, type ReactNode } from 'react'
import { SupabaseContext, useSupabase } from '@/contexts/SupabaseProvider'
import { DevPortalBar } from './DevPortalBar'
import { applyDevSimulation, useDevSimulation } from './devPortal'

/**
 * Where the simulation meets the app: a second `SupabaseContext` provider,
 * mounted directly under the real one, holding the same value with the two
 * write flags rewritten.
 *
 * It is an overlay rather than a branch inside `SupabaseProvider` because the
 * provider is application code and this is not. The provider answers what the
 * session IS — a real question, asked of a real database, in every
 * installation of this kit. This answers what the kit's author has asked it
 * to pretend, and no deployment has that question. Keeping the two apart is
 * the whole point of the move: the shared provider now computes one honest
 * `canWrite` and stops there, and the lie, where there is one, is applied
 * here, in a module a deployment never resolves.
 *
 * Only `canWrite` and `canAgentWrite` move. Every other field is passed
 * through by identity, which is not a convention but the thing the portal's
 * contract test asserts: a simulation that also flipped, say,
 * `isServiceAccount` would be a lie the rest of the app reads as fact.
 *
 * `canAgentWrite` is recomputed rather than simulated on its own, because it
 * is `canWrite` minus the no-database trial and it has to stay so — the trial
 * has no database to write to, and simulating admin cannot conjure one.
 */
export function DevPortalOverlay({ children }: { children: ReactNode }) {
  const real = useSupabase()
  const simulation = useDevSimulation()
  const canWrite = applyDevSimulation(simulation, real.canWrite)

  const value = useMemo(
    () => ({
      ...real,
      canWrite,
      canAgentWrite: canWrite && !real.isSampleTrial,
    }),
    [real, canWrite],
  )

  return (
    <SupabaseContext.Provider value={value}>
      {children}
      {/* Last, so the bar paints over the app rather than under it. */}
      <DevPortalBar />
    </SupabaseContext.Provider>
  )
}
