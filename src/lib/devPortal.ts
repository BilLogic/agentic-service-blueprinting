import { useSyncExternalStore } from 'react'

/**
 * Developer portal — a CLIENT-SIDE tier simulator.
 *
 * Someone building on this kit has to see both tiers: the ADMIN surfaces
 * (Design mode, handles, panel editors, the agent's write tools) and the
 * VIEWER surfaces the same screens collapse to. Today that costs a second
 * account and a sign-out/sign-in round trip per look. This override lets one
 * session pretend to be either.
 *
 * What it changes: `canWrite` and `canAgentWrite` — the two flags the UI
 * gates authoring on. That is the whole reach.
 *
 * What it CANNOT change: anything server-side. RLS's restrictive policies
 * and the RPC grants never see this value; they are not consulted by it and
 * they do not consult it. Simulating ADMIN on an account with no rights
 * shows the editing UI and every save then fails with the database's own
 * error — which is the enforcement working, and is stated in the portal copy
 * rather than left to be discovered.
 */

export type DevTierOverride = 'off' | 'admin' | 'viewer'

const STORAGE_KEY = 'sb-dev-tier-override'

function read(): DevTierOverride {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw === 'admin' || raw === 'viewer' ? raw : 'off'
  } catch {
    return 'off'
  }
}

// Cached snapshot, same reasoning as agent settings: a fresh value per
// getSnapshot call would loop the render.
let snapshot: DevTierOverride = typeof window === 'undefined' ? 'off' : read()
const listeners = new Set<() => void>()

export function setDevTierOverride(next: DevTierOverride): void {
  snapshot = next
  try {
    if (next === 'off') window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Quota / private-browsing failures degrade to a session-only override.
  }
  listeners.forEach((listener) => listener())
}

export function useDevTierOverride(): DevTierOverride {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => snapshot,
    () => 'off' as DevTierOverride,
  )
}

/** Apply the override to a real tier flag. `off` returns it untouched. */
export function applyDevTierOverride(
  override: DevTierOverride,
  real: boolean,
): boolean {
  if (override === 'admin') return true
  if (override === 'viewer') return false
  return real
}

export type RealTierId =
  | 'no-backend'
  | 'anon'
  | 'signed-in-viewer'
  | 'signed-in-admin'
  | 'dev-service-key'

export type RealTierFacts = {
  configured: boolean
  signedIn: boolean
  isServiceAccount: boolean
  isDevAuthoring: boolean
}

/**
 * The honest answer to "what is this session, really?" — read next to the
 * override so nobody mistakes the simulation for the account.
 */
export function describeRealTier(facts: RealTierFacts): {
  id: RealTierId
  label: string
  detail: string
} {
  if (facts.isDevAuthoring)
    return {
      id: 'dev-service-key',
      label: 'Signed in with service role',
      detail: 'Dev server holding the local authoring key — writes land live.',
    }
  if (!facts.configured)
    return {
      id: 'no-backend',
      label: 'No backend configured',
      detail:
        'No Supabase URL/key in this build — the canvas renders the bundled sample blueprint.',
    }
  if (!facts.signedIn)
    return {
      id: 'anon',
      label: 'Anon, read-only',
      detail: 'Connected with the anon key and no session — reads only.',
    }
  return facts.isServiceAccount
    ? {
        id: 'signed-in-admin',
        label: 'Signed in, editing tier',
        detail: 'This account passes the service-account check — writes allowed.',
      }
    : {
        id: 'signed-in-viewer',
        label: 'Signed in, viewer tier',
        detail: 'Signed in without the service role — reads only.',
      }
}
