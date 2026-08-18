// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AgentTrialBanner } from '@/components/editor/AgentTrialBanner'
import {
  DevPortalSection,
  DevTierOverrideBadge,
} from '@/components/editor/DevPortal'
import {
  SupabaseProvider,
  useSupabase,
} from '@/contexts/SupabaseProvider'
import { saveAgentSettings } from '@/lib/agent/settings'
import {
  applyDevSimulation,
  describeAgentTrial,
  describeRealTier,
  parseStoredSimulation,
  setDevSimulation,
  setDevSimulatedTier,
  setDevSimulationOn,
  SIMULATION_OFF,
} from '@/lib/devPortal'

/**
 * The developer portal's contract, pinned.
 *
 * The simulation is CLIENT-SIDE: it may move `canWrite` and `canAgentWrite`
 * and nothing else. A version of it that also flipped, say, `isServiceAccount`
 * or `configured` would be a lie the rest of the app reads as fact — which is
 * why "and nothing else" is a test, not a comment.
 *
 * These tests run with NO Supabase env, which is also the no-database agent
 * trial's condition — so the trial's flags are pinned in the same file.
 */

const REAL_TIER_KEYS = [
  'configured',
  'isDevAuthoring',
  'isEditPreview',
  'isServiceAccount',
  'canAgent',
  'isSampleTrial',
  'realCanWrite',
] as const

type Snapshot = Record<string, unknown>

function Probe({ onRender }: { onRender: (value: Snapshot) => void }) {
  onRender(useSupabase() as unknown as Snapshot)
  return null
}

function readContext(): Snapshot {
  let latest: Snapshot = {}
  render(
    <SupabaseProvider>
      <Probe
        onRender={(value) => {
          latest = value
        }}
      />
    </SupabaseProvider>,
  )
  return latest
}

beforeEach(() => {
  window.localStorage.clear()
  act(() => {
    setDevSimulation(SIMULATION_OFF)
    saveAgentSettings({ provider: 'google', keys: { google: '' } })
  })
})

afterEach(cleanup)

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
    window.localStorage.setItem('sb-dev-tier-override', 'viewer')
    expect(
      parseStoredSimulation(
        window.localStorage.getItem('sb-dev-simulation'),
        window.localStorage.getItem('sb-dev-tier-override'),
      ),
    ).toEqual({ on: true, tier: 'regular' })

    setDevSimulationOn(false)
    expect(window.localStorage.getItem('sb-dev-tier-override')).toBeNull()
    expect(window.localStorage.getItem('sb-dev-simulation')).toBe(
      '{"on":false,"tier":"regular"}',
    )
  })
})

describe('the simulation persists', () => {
  it('remembers the tier across an off/on cycle', () => {
    setDevSimulatedTier('admin')
    expect(window.localStorage.getItem('sb-dev-simulation')).toBe(
      '{"on":true,"tier":"admin"}',
    )
    setDevSimulationOn(false)
    expect(window.localStorage.getItem('sb-dev-simulation')).toBe(
      '{"on":false,"tier":"admin"}',
    )
    setDevSimulationOn(true)
    expect(readContext().canWrite).toBe(true)
  })
})

describe('describeRealTier reads the session honestly', () => {
  it('names each tier', () => {
    const facts = {
      configured: true,
      signedIn: false,
      isServiceAccount: false,
      isDevAuthoring: false,
    }
    expect(
      describeRealTier({ ...facts, configured: false }).id,
    ).toBe('no-backend')
    expect(describeRealTier(facts).id).toBe('anon')
    expect(describeRealTier({ ...facts, signedIn: true }).id).toBe(
      'signed-in-viewer',
    )
    expect(
      describeRealTier({ ...facts, signedIn: true, isServiceAccount: true }).id,
    ).toBe('signed-in-admin')
    expect(describeRealTier({ ...facts, isDevAuthoring: true }).id).toBe(
      'dev-service-key',
    )
  })
})

describe('describeAgentTrial names the three conditions', () => {
  it('reads active, not-needed, and available', () => {
    expect(
      describeAgentTrial({ isSampleTrial: true, configured: false }).id,
    ).toBe('active')
    expect(
      describeAgentTrial({ isSampleTrial: false, configured: true }).id,
    ).toBe('not-needed')
    expect(
      describeAgentTrial({ isSampleTrial: false, configured: false }).id,
    ).toBe('available')
  })
})

describe('the simulation moves the write flags and nothing else', () => {
  it('simulating admin grants only the UI write flags', () => {
    const before = readContext()
    expect(before.canWrite).toBe(false)
    expect(before.canAgentWrite).toBe(false)
    cleanup()

    setDevSimulatedTier('admin')
    const after = readContext()
    expect(after.canWrite).toBe(true)
    expect(after.canAgentWrite).toBe(true)
    for (const key of REAL_TIER_KEYS) {
      expect(after[key], key).toEqual(before[key])
    }
  })

  it('simulating regular withholds them again', () => {
    setDevSimulatedTier('regular')
    const value = readContext()
    expect(value.canWrite).toBe(false)
    expect(value.canAgentWrite).toBe(false)
  })
})

describe('the no-database agent trial', () => {
  it('stays closed with no key, and opens read-only once a key is saved', () => {
    const before = readContext()
    expect(before.isSampleTrial).toBe(false)
    expect(before.canAgent).toBe(false)
    cleanup()

    act(() => {
      saveAgentSettings({ keys: { google: 'test-key-not-a-real-one' } })
    })
    const after = readContext()
    expect(after.isSampleTrial).toBe(true)
    expect(after.canAgent).toBe(true)
    // The agent opens; it does NOT gain write tools. Even simulating admin
    // cannot conjure a database to write to.
    expect(after.canAgentWrite).toBe(false)
    cleanup()

    setDevSimulatedTier('admin')
    expect(readContext().canAgentWrite).toBe(false)
  })
})

describe('the shell indicator', () => {
  it('renders nothing while the simulation is off', () => {
    render(
      <SupabaseProvider>
        <DevTierOverrideBadge />
      </SupabaseProvider>,
    )
    expect(document.querySelector('[data-dev-tier-badge]')).toBeNull()
  })

  it('names the simulated tier while the simulation is on', () => {
    setDevSimulatedTier('admin')
    render(
      <SupabaseProvider>
        <DevTierOverrideBadge />
      </SupabaseProvider>,
    )
    expect(screen.getByText('simulating admin')).toBeTruthy()
    expect(
      document.querySelector('[data-dev-tier-badge="admin"]'),
    ).not.toBeNull()
  })
})

describe('the portal section is controls, not prose', () => {
  function renderSection() {
    render(
      <SupabaseProvider>
        <DevPortalSection />
      </SupabaseProvider>,
    )
  }

  it('offers exactly two simulated tiers, disabled until the switch is on', () => {
    renderSection()
    const group = document.querySelector('[data-dev-simulated-tier]')
    expect(group?.getAttribute('data-disabled')).not.toBeNull()
    expect(screen.getByText('Regular')).toBeTruthy()
    expect(screen.getByText('Admin')).toBeTruthy()
    expect(screen.queryByText('Real')).toBeNull()
    expect(screen.queryByText('Viewer')).toBeNull()
  })

  it('reads the real session out as a badge, not a sentence', () => {
    renderSection()
    expect(
      document.querySelector('[data-real-tier="no-backend"]'),
    ).not.toBeNull()
    expect(
      document.querySelector('[data-real-can-write="false"]'),
    ).not.toBeNull()
    // The caveats live behind the ⓘ buttons, not in visible copy.
    const portal = document.querySelector('[data-dev-portal]')
    expect(portal?.textContent).not.toContain('Row-level security')
  })

  it('enables the pair once the simulation is switched on', () => {
    setDevSimulationOn(true)
    renderSection()
    expect(
      document
        .querySelector('[data-dev-simulated-tier]')
        ?.getAttribute('data-disabled'),
    ).toBeNull()
  })
})

describe('the trial banner', () => {
  it('says sample, read-only, and what would change it, in one line', () => {
    render(<AgentTrialBanner />)
    const banner = document.querySelector('[data-agent-trial-banner]')
    expect(banner).not.toBeNull()
    expect(banner?.textContent).toContain('Sample data, read-only.')
    expect(banner?.textContent).toContain('Connect a database to author.')
    // One line: the paragraph that used to explain the trial is now the ⓘ.
    expect(banner?.textContent).not.toContain('bundled sample blueprint')
  })
})
