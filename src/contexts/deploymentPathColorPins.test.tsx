// @vitest-environment jsdom
/**
 * A deployment's path-colour pins reach the board through the config it hands
 * the app, not through an edit to the colour theme.
 *
 * `pathColorTheme.test.ts` holds what a pin does once the theme has one. This
 * holds the step before it: the pins handed to the provider are the ones the
 * theme draws with, and without any the theme draws exactly as it would have
 * anyway. Invented names only — the template holds no deployment's vocabulary.
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DeploymentConfigProvider } from '@/contexts/DeploymentConfigContext'
import type { DeploymentConfig } from '@/deploymentConfig'
import {
  configurePathColorPins,
  getPathColor,
  getPathDashArray,
} from '@/lib/pathColorTheme'

const alpha = { kind: 'variant', name: 'Alpha Path' } as const
const witness = { kind: 'variant', name: 'Witness' } as const
const north = { kind: 'variant', name: 'North' } as const

const drawn = (path: typeof alpha | typeof witness | typeof north) => [
  getPathColor(path),
  getPathDashArray(path),
]

// Module-level, as a host passes it.
const PINNED: DeploymentConfig = {
  pathColorPins: { 'Alpha Path': 2, Witness: 2, North: 0 },
}

afterEach(() => {
  cleanup()
  configurePathColorPins({})
})

describe('path-colour pins through the deployment config', () => {
  it('a supplied map pins those paths to those slots', () => {
    render(
      <DeploymentConfigProvider config={PINNED}>
        <span />
      </DeploymentConfigProvider>,
    )

    // Two names on one slot draw as one pair, colour and dash together.
    expect(drawn(alpha)).toEqual(drawn(witness))
    // A different slot is a different pair, so the pins are doing the work
    // rather than agreeing with the hash by accident.
    expect(getPathColor(alpha)).not.toBe(getPathColor(north))
    expect(getPathDashArray(alpha)).not.toBe(getPathDashArray(north))
  })

  it('with no map, every path draws as the hash would draw it', () => {
    configurePathColorPins({})
    const hashed = [drawn(alpha), drawn(witness), drawn(north)]

    render(
      <DeploymentConfigProvider>
        <span />
      </DeploymentConfigProvider>,
    )

    expect([drawn(alpha), drawn(witness), drawn(north)]).toEqual(hashed)
  })
})
