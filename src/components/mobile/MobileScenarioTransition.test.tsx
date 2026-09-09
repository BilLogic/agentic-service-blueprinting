// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MobileScenarioTransition } from '@/components/mobile/MobileScenarioTransition'
import { MOTION_FADE_MS } from '@/lib/motion'

describe('MobileScenarioTransition', () => {
  let revealIncoming: (() => void) | null

  beforeEach(() => {
    vi.useFakeTimers()
    revealIncoming = null
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('fades out the old world, swaps while hidden, then reveals the new world', () => {
    const view = render(
      <MobileScenarioTransition scenarioId="scenario-a">
        {(scenarioId, onFitReady) => {
          revealIncoming = onFitReady
          return <div data-scenario={scenarioId} />
        }}
      </MobileScenarioTransition>,
    )
    const surface = () =>
      view.container.querySelector<HTMLElement>('[data-mobile-scenario-swap]')!
    const scenario = () =>
      view.container.querySelector<HTMLElement>('[data-scenario]')!

    expect(surface().dataset.mobileScenarioSwap).toBe('idle')
    expect(scenario().dataset.scenario).toBe('scenario-a')

    view.rerender(
      <MobileScenarioTransition scenarioId="scenario-b">
        {(scenarioId, onFitReady) => {
          revealIncoming = onFitReady
          return <div data-scenario={scenarioId} />
        }}
      </MobileScenarioTransition>,
    )
    expect(surface().dataset.mobileScenarioSwap).toBe('out')
    expect(scenario().dataset.scenario).toBe('scenario-a')

    act(() => vi.advanceTimersByTime(MOTION_FADE_MS))
    expect(surface().dataset.mobileScenarioSwap).toBe('in')
    expect(scenario().dataset.scenario).toBe('scenario-b')

    act(() => revealIncoming?.())
    expect(surface().dataset.mobileScenarioSwap).toBe('idle')
    expect(scenario().dataset.scenario).toBe('scenario-b')
    expect(surface().dataset.editorView).toBe('true')
  })

  it('reveals the current world when a pending swap reverses before commit', () => {
    const view = render(
      <MobileScenarioTransition scenarioId="scenario-a">
        {(scenarioId) => <div data-scenario={scenarioId} />}
      </MobileScenarioTransition>,
    )
    const surface = () =>
      view.container.querySelector<HTMLElement>('[data-mobile-scenario-swap]')!

    view.rerender(
      <MobileScenarioTransition scenarioId="scenario-b">
        {(scenarioId) => <div data-scenario={scenarioId} />}
      </MobileScenarioTransition>,
    )
    expect(surface().dataset.mobileScenarioSwap).toBe('out')

    view.rerender(
      <MobileScenarioTransition scenarioId="scenario-a">
        {(scenarioId) => <div data-scenario={scenarioId} />}
      </MobileScenarioTransition>,
    )
    expect(surface().dataset.mobileScenarioSwap).toBe('idle')
    act(() => vi.advanceTimersByTime(MOTION_FADE_MS))
    expect(surface().dataset.mobileScenarioSwap).toBe('idle')
  })

})
