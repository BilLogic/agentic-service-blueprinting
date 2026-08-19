import { useSyncExternalStore } from 'react'

/**
 * Developer portal — a CLIENT-SIDE tier simulator.
 *
 * Someone building on this kit has to see both tiers: the ADMIN surfaces
 * (Design mode, handles, panel editors, the agent's write tools) and the
 * REGULAR surfaces the same screens collapse to. Today that costs a second
 * account and a sign-out/sign-in round trip per look. This lets one session
 * pretend to be either.
 *
 * The model is a simulation that is on or off, plus which tier it plays when
 * it is on. "Use my real session" is not a third tier — it is the simulation
 * being off — so the tier choice never sits in a row next to the truth as if
 * it were a peer of it.
 *
 * What it changes: `canWrite` and `canAgentWrite` — the two flags the UI
 * gates authoring on. That is the whole reach.
 *
 * What it CANNOT change: anything server-side. RLS's restrictive policies
 * and the RPC grants never see this value; they are not consulted by it and
 * they do not consult it. Simulating ADMIN on an account with no rights
 * shows the editing UI and every save then fails with the database's own
 * error — which is the enforcement working, and is said in the portal's
 * tooltips rather than left to be discovered.
 */

export type DevSimulatedTier = 'regular' | 'admin'

export type DevSimulation = {
  /** Whether the UI is playing a tier at all. Off = the real session. */
  on: boolean
  /** Which tier it plays when on — remembered across an off/on cycle. */
  tier: DevSimulatedTier
}

const STORAGE_KEY = 'sb-dev-simulation'
/** The tri-state key this replaced: `'admin' | 'viewer'`, absent when off. */
const LEGACY_STORAGE_KEY = 'sb-dev-tier-override'

export const SIMULATION_OFF: DevSimulation = { on: false, tier: 'regular' }

/**
 * Everything that could be in storage → a simulation, with no throw path.
 *
 * Pure, and separately tested, because the migration is the part that meets
 * a browser that has been running the old build: `'admin'` was a tier and
 * stays one; `'viewer'` was the old name for regular; anything else — the
 * old `'off'`, a truncated write, a value from a future build — is off.
 */
export function parseStoredSimulation(
  current: string | null,
  legacy: string | null,
): DevSimulation {
  if (current !== null) {
    try {
      const parsed: unknown = JSON.parse(current)
      if (parsed !== null && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>
        const tier: DevSimulatedTier =
          record.tier === 'admin' ? 'admin' : 'regular'
        return { on: record.on === true, tier }
      }
    } catch {
      // Unparseable — fall through to the legacy key, then to off.
    }
  }
  if (legacy === 'admin') return { on: true, tier: 'admin' }
  if (legacy === 'viewer') return { on: true, tier: 'regular' }
  return SIMULATION_OFF
}

function read(): DevSimulation {
  try {
    return parseStoredSimulation(
      window.localStorage.getItem(STORAGE_KEY),
      window.localStorage.getItem(LEGACY_STORAGE_KEY),
    )
  } catch {
    return SIMULATION_OFF
  }
}

// Cached snapshot, same reasoning as agent settings: a fresh value per
// getSnapshot call would loop the render.
let snapshot: DevSimulation =
  typeof window === 'undefined' ? SIMULATION_OFF : read()
const listeners = new Set<() => void>()

export function setDevSimulation(next: DevSimulation): void {
  snapshot = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    // The old key is read once, on the first load after the upgrade, and
    // then retired — leaving it would let a stale value win a later reset.
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    // Quota / private-browsing failures degrade to a session-only simulation.
  }
  listeners.forEach((listener) => listener())
}

/** Flip the simulation on or off, keeping the remembered tier. */
export function setDevSimulationOn(on: boolean): void {
  setDevSimulation({ on, tier: snapshot.tier })
}

/** Choose the played tier. Choosing one implies the simulation is on. */
export function setDevSimulatedTier(tier: DevSimulatedTier): void {
  setDevSimulation({ on: true, tier })
}

export function useDevSimulation(): DevSimulation {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => snapshot,
    () => SIMULATION_OFF,
  )
}

/** Apply the simulation to a real tier flag. Off returns it untouched. */
export function applyDevSimulation(
  simulation: DevSimulation,
  real: boolean,
): boolean {
  if (!simulation.on) return real
  return simulation.tier === 'admin'
}
