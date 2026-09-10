// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SupabaseProvider, useSupabase } from '@/contexts/SupabaseProvider'
import { saveAgentSettings } from '@/lib/agent/settings'
import { storageKey } from '@/lib/storageNamespace'
import { DevPortalBar } from './DevPortalBar'
import { DevPortalOverlay } from './DevPortalOverlay'
import {
  applyDevSimulation,
  parseStoredSimulation,
  setDevSimulation,
  setDevSimulatedTier,
  setDevSimulationOn,
  SIMULATION_OFF,
} from './devPortal'

/**
 * The developer portal's contract, pinned.
 *
 * The simulation is CLIENT-SIDE: it may move `canWrite` and `canAgentWrite`
 * and nothing else. A version of it that also flipped, say, `isServiceAccount`
 * or `configured` would be a lie the rest of the app reads as fact — which is
 * why "and nothing else" is a test, not a comment.
 *
 * Since the portal left shared source, that contract has a place to be
 * measured that it did not have before: the overlay is a SECOND provider
 * under the real one, so a probe above it and a probe below it read the same
 * session through and around the simulation, in one tree. Everything the
 * overlay does is the difference between those two readings.
 *
 * These tests run with `import.meta.env.DEV` true, which is the portal's
 * whole condition — so the shipped behaviour is the one thing this file
 * cannot observe by default, and the block that asserts it says the other
 * answer out loud with `vi.stubEnv`.
 */

type Snapshot = Record<string, unknown>

/** The two flags the simulation is allowed to move. */
const SIMULATED_KEYS = ['canWrite', 'canAgentWrite']

function Probe({ onRender }: { onRender: (value: Snapshot) => void }) {
  onRender(useSupabase() as unknown as Snapshot)
  return null
}

/**
 * One provider, read from both sides of the overlay: `real` is what the
 * session is, `simulated` is what the app below the portal believes.
 */
function readBothSides(): { real: Snapshot; simulated: Snapshot } {
  let real: Snapshot = {}
  let simulated: Snapshot = {}
  render(
    <SupabaseProvider>
      <Probe
        onRender={(value) => {
          real = value
        }}
      />
      <DevPortalOverlay>
        <Probe
          onRender={(value) => {
            simulated = value
          }}
        />
      </DevPortalOverlay>
    </SupabaseProvider>,
  )
  return { real, simulated }
}

/** What the app below the portal believes. */
function readSimulated(): Snapshot {
  return readBothSides().simulated
}

beforeEach(() => {
  window.localStorage.clear()
  act(() => {
    setDevSimulation(SIMULATION_OFF)
    saveAgentSettings({ provider: 'google', keys: { google: '' } })
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe('applyDevSimulation', () => {
  it('passes the real value through while the simulation is off', () => {
    expect(applyDevSimulation({ on: false, tier: 'admin' }, false)).toBe(false)
    expect(applyDevSimulation({ on: false, tier: 'regular' }, true)).toBe(true)
  })

  it('forces the played tier in both directions', () => {
    expect(applyDevSimulation({ on: true, tier: 'admin' }, false)).toBe(true)
    expect(applyDevSimulation({ on: true, tier: 'regular' }, true)).toBe(false)
  })
})

describe('the stored value survives the tri-state it replaced', () => {
  it('maps every legacy value onto the switch-and-pair model', () => {
    expect(parseStoredSimulation(null, 'admin')).toEqual({
      on: true,
      tier: 'admin',
    })
    // 'viewer' was the old name for the regular tier — simulation ON.
    expect(parseStoredSimulation(null, 'viewer')).toEqual({
      on: true,
      tier: 'regular',
    })
    expect(parseStoredSimulation(null, 'off')).toEqual(SIMULATION_OFF)
    expect(parseStoredSimulation(null, null)).toEqual(SIMULATION_OFF)
  })

  it('reads the current shape, and never throws on a broken one', () => {
    expect(parseStoredSimulation('{"on":true,"tier":"admin"}', null)).toEqual({
      on: true,
      tier: 'admin',
    })
    expect(parseStoredSimulation('{"on":false,"tier":"admin"}', null)).toEqual({
      on: false,
      tier: 'admin',
    })
    expect(parseStoredSimulation('not json', 'viewer')).toEqual({
      on: true,
      tier: 'regular',
    })
    expect(parseStoredSimulation('{"on":true,"tier":"wizard"}', null)).toEqual({
      on: true,
      tier: 'regular',
    })
    expect(parseStoredSimulation('null', null)).toEqual(SIMULATION_OFF)
  })

  it('boots a browser holding only the legacy key, then retires it', () => {
    window.localStorage.clear()
    window.localStorage.setItem(storageKey('dev-tier-override'), 'viewer')
    expect(
      parseStoredSimulation(
        window.localStorage.getItem(storageKey('dev-simulation')),
        window.localStorage.getItem(storageKey('dev-tier-override')),
      ),
    ).toEqual({ on: true, tier: 'regular' })

    setDevSimulationOn(false)
    expect(
      window.localStorage.getItem(storageKey('dev-tier-override')),
    ).toBeNull()
    expect(window.localStorage.getItem(storageKey('dev-simulation'))).toBe(
      '{"on":false,"tier":"regular"}',
    )
  })
})

describe('the simulation persists', () => {
  it('remembers the tier across an off/on cycle', () => {
    setDevSimulatedTier('admin')
    expect(window.localStorage.getItem(storageKey('dev-simulation'))).toBe(
      '{"on":true,"tier":"admin"}',
    )
    setDevSimulationOn(false)
    expect(window.localStorage.getItem(storageKey('dev-simulation'))).toBe(
      '{"on":false,"tier":"admin"}',
    )
    setDevSimulationOn(true)
    expect(readSimulated().canWrite).toBe(true)
  })
})

describe('the overlay moves the write flags and nothing else', () => {
  it('changes nothing at all while the simulation is off', () => {
    const { real, simulated } = readBothSides()
    for (const key of Object.keys(real)) {
      expect(simulated[key], key).toBe(real[key])
    }
    expect(simulated.canWrite).toBe(false)
  })

  it('simulating admin grants only the UI write flags', () => {
    setDevSimulatedTier('admin')
    const { real, simulated } = readBothSides()

    expect(real.canWrite).toBe(false)
    expect(real.canAgentWrite).toBe(false)
    expect(simulated.canWrite).toBe(true)
    expect(simulated.canAgentWrite).toBe(true)

    // Every other field reaches the app below by identity. The list is not
    // written out here on purpose: a field added to the provider tomorrow is
    // covered by this the day it lands.
    for (const key of Object.keys(real)) {
      if (SIMULATED_KEYS.includes(key)) continue
      expect(simulated[key], key).toBe(real[key])
    }
  })

  it('simulating regular withholds them again', () => {
    setDevSimulatedTier('regular')
    const value = readSimulated()
    expect(value.canWrite).toBe(false)
    expect(value.canAgentWrite).toBe(false)
  })

  it('cannot conjure a database for the no-database trial to write to', () => {
    // `canAgentWrite` is recomputed from the simulated `canWrite` rather than
    // simulated on its own, precisely so this stays true: the trial runs
    // against the bundled sample and there is nothing on the other end of a
    // write, whichever tier the portal is playing.
    act(() => {
      saveAgentSettings({ keys: { google: 'test-key-not-a-real-one' } })
    })
    setDevSimulatedTier('admin')
    const value = readSimulated()
    expect(value.isSampleTrial).toBe(true)
    expect(value.canWrite).toBe(true)
    expect(value.canAgentWrite).toBe(false)
  })
})

describe('outside development there is no portal to open', () => {
  /**
   * The storage key is PRESENT throughout. A browser that ran a dev session
   * keeps it, and devtools can write it into one that never did; asserting
   * the shipped behaviour with the key absent would assert nothing about
   * either. `setDevSimulatedTier` writes exactly what a dev session leaves
   * behind.
   *
   * The directory the portal now lives in is a coarser guard in front of this
   * one — a production build never resolves `dev/`, so none of this code is
   * there to run. It is not a replacement for the seam: a directory is not
   * something a test can put the production answer in front of, and this is.
   */
  function simulateAdminAndShip() {
    setDevSimulatedTier('admin')
    expect(window.localStorage.getItem(storageKey('dev-simulation'))).toBe(
      '{"on":true,"tier":"admin"}',
    )
    vi.stubEnv('DEV', false)
  }

  it('hands back the real session, whatever storage says', () => {
    simulateAdminAndShip()
    const { real, simulated } = readBothSides()
    expect(simulated.canWrite).toBe(real.canWrite)
    expect(simulated.canWrite).toBe(false)
    expect(simulated.canAgentWrite).toBe(false)
  })

  it('renders neither the controls that set it nor the badge that tells on it', () => {
    simulateAdminAndShip()
    render(<DevPortalBar />)
    expect(document.querySelector('[data-dev-portal]')).toBeNull()
    expect(document.querySelector('[data-dev-tier-badge]')).toBeNull()
    expect(screen.queryByText('simulating admin')).toBeNull()
  })

  it('leaves the stored value alone, and honours it again in development', () => {
    simulateAdminAndShip()
    expect(readSimulated().canWrite).toBe(false)
    expect(window.localStorage.getItem(storageKey('dev-simulation'))).toBe(
      '{"on":true,"tier":"admin"}',
    )
    cleanup()

    vi.unstubAllEnvs()
    expect(readSimulated().canWrite).toBe(true)
  })
})

describe('the portal bar is controls, not prose', () => {
  it('offers exactly two simulated tiers, disabled until the switch is on', () => {
    render(<DevPortalBar />)
    const group = document.querySelector('[data-dev-simulated-tier]')
    expect(group?.getAttribute('data-disabled')).not.toBeNull()
    expect(screen.getByText('Regular')).toBeTruthy()
    expect(screen.getByText('Admin')).toBeTruthy()
    expect(screen.queryByText('Real')).toBeNull()
    expect(screen.queryByText('Viewer')).toBeNull()
  })

  it('is the two decisions and nothing else', () => {
    render(<DevPortalBar />)
    const portal = document.querySelector('[data-dev-portal]')
    // Status this surface used to report — what the real session is, and
    // whether the no-database agent trial is running — is derivable from the
    // workspace badges and the agent panel. Reading it back here turned a
    // settings popover into a dashboard.
    expect(document.querySelector('[data-real-tier]')).toBeNull()
    expect(document.querySelector('[data-real-can-write]')).toBeNull()
    expect(document.querySelector('[data-agent-trial]')).toBeNull()
    expect(document.querySelector('[data-dev-simulate]')).not.toBeNull()
    expect(document.querySelector('[data-dev-simulated-tier]')).not.toBeNull()
    // The caveats live behind the ⓘ buttons, not in visible copy.
    expect(portal?.textContent).not.toContain('Row-level security')
  })

  it('enables the pair once the simulation is switched on', () => {
    setDevSimulationOn(true)
    render(<DevPortalBar />)
    expect(
      document
        .querySelector('[data-dev-simulated-tier]')
        ?.getAttribute('data-disabled'),
    ).toBeNull()
  })
})

describe('the simulation carries its own tell', () => {
  it('says nothing while the simulation is off', () => {
    render(<DevPortalBar />)
    expect(document.querySelector('[data-dev-tier-badge]')).toBeNull()
  })

  it('names the simulated tier while the simulation is on', () => {
    setDevSimulatedTier('admin')
    render(<DevPortalBar />)
    expect(screen.getByText('simulating admin')).toBeTruthy()
    expect(
      document.querySelector('[data-dev-tier-badge="admin"]'),
    ).not.toBeNull()
  })
})
