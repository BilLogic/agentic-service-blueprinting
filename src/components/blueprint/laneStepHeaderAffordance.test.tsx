// @vitest-environment jsdom
/**
 * A lane or step header reads right on every input (#306).
 *
 * The bug: the name span painted above the `absolute inset-0` opener, so a
 * click on the word — the natural target — hit the name and was lost, never
 * reaching the button under it. And a definition surfaced only while the
 * pointer was over the exact word, with nothing at all for a touch reader who
 * has no hover and whose tap is spent opening the panel.
 *
 * Three behaviours, asserted as a reader observes them and never as a class:
 *
 *   - a click ANYWHERE on the header — the label included — opens the panel
 *     (the selection toggles, read back through the opener's `aria-pressed`);
 *   - hovering the block surfaces the definition after a short delay, from
 *     anywhere on the block rather than over one word;
 *   - a tap on the touch ⓘ surfaces the definition WITHOUT opening the panel.
 *
 * Prior art for driving Base UI hover in jsdom: `entityHeader.test.tsx`,
 * `definitionCard.test.tsx`.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import { LaneHeaderAffordance } from '@/components/blueprint/LaneHeaderAffordance'
import { StepHeaderAffordance } from '@/components/blueprint/StepHeaderAffordance'
import { BlueprintCellDetailProvider } from '@/contexts/BlueprintCellDetailContext'
import { ScenarioBoardScopeContext } from '@/contexts/scenarioBoardScopeContext'
import { EntityDetailProvider } from '@/contexts/EntityDetailContext'
import { ENTITY_KIND_DEFINITIONS } from '@/lib/panelTerms'

afterEach(cleanup)

/**
 * The header, mounted with the two gates the detail affordance needs live —
 * the feature flag (`enabled`) and this board being the one in scope. Pass
 * `false` to render the inert-prose posture instead.
 */
function mount(node: ReactElement, interactive = true) {
  return render(
    <EntityDetailProvider>
      <BlueprintCellDetailProvider enabled={interactive}>
        <ScenarioBoardScopeContext.Provider value={interactive}>
          {node}
        </ScenarioBoardScopeContext.Provider>
      </BlueprintCellDetailProvider>
    </EntityDetailProvider>,
  )
}

/** The opener's own read-back of whether its panel is open. */
const lanePressed = () =>
  document
    .querySelector('[data-lane-header-affordance]')
    ?.getAttribute('aria-pressed')
const stepPressed = () =>
  document
    .querySelector('[data-step-header-affordance]')
    ?.getAttribute('aria-pressed')

/** The touch info affordance — hidden at rest on a pointer device, present here. */
const infoButton = () =>
  document.querySelector('[data-canvas-header-info]') as HTMLElement | null

/** Room for the header's own ~500ms hover delay, as `entityHeader.test` does. */
const HOVER_BUDGET = { timeout: 3000 }

const laneDefinition = ENTITY_KIND_DEFINITIONS.lane.definition
const stepDefinition = ENTITY_KIND_DEFINITIONS.step.definition

/* -------------------------------------------------- click anywhere opens */

describe('a click opens the panel from anywhere on the header', () => {
  it('opens the lane panel when the label itself is clicked', () => {
    mount(<LaneHeaderAffordance laneId="lane-1" laneName="Front stage" />)
    expect(lanePressed()).toBe('false')
    // The label, not the surrounding block — the target that used to be dead.
    fireEvent.click(screen.getByText('Front stage'))
    expect(lanePressed()).toBe('true')
  })

  it('opens the step panel when the label itself is clicked', () => {
    mount(<StepHeaderAffordance stepId="step-1" name="Warm-Up" />)
    expect(stepPressed()).toBe('false')
    fireEvent.click(screen.getByText('Warm-Up'))
    expect(stepPressed()).toBe('true')
  })

  it('opens the lane panel from the opener too, and toggles shut', () => {
    mount(<LaneHeaderAffordance laneId="lane-1" laneName="Front stage" />)
    const opener = document.querySelector(
      '[data-lane-header-affordance]',
    ) as HTMLElement
    fireEvent.click(opener)
    expect(lanePressed()).toBe('true')
    fireEvent.click(opener)
    expect(lanePressed()).toBe('false')
  })
})

/* ------------------------------------------------ hover defines the block */

describe('hovering the block surfaces the definition after a delay', () => {
  it('does not surface the lane definition the instant the pointer arrives', () => {
    mount(<LaneHeaderAffordance laneId="lane-1" laneName="Front stage" />)
    const block = document.querySelector(
      '[data-blueprint-row-header]',
    ) as HTMLElement
    fireEvent.pointerEnter(block, { pointerType: 'mouse' })
    // The delay is the point: nothing on the very first frame.
    expect(screen.queryByText(laneDefinition)).toBeNull()
  })

  it('surfaces the lane definition once the delay elapses', async () => {
    mount(<LaneHeaderAffordance laneId="lane-1" laneName="Front stage" />)
    const block = document.querySelector(
      '[data-blueprint-row-header]',
    ) as HTMLElement
    fireEvent.pointerEnter(block, { pointerType: 'mouse' })
    await waitFor(
      () => expect(screen.queryByText(laneDefinition)).not.toBeNull(),
      HOVER_BUDGET,
    )
  })

  it('surfaces the step definition from a hover anywhere on the column header', async () => {
    mount(<StepHeaderAffordance stepId="step-1" name="Warm-Up" />)
    const block = document.querySelector(
      '[data-blueprint-column-header]',
    ) as HTMLElement
    fireEvent.pointerEnter(block, { pointerType: 'mouse' })
    await waitFor(
      () => expect(screen.queryByText(stepDefinition)).not.toBeNull(),
      HOVER_BUDGET,
    )
  })

  it('surfaces the definition even where the panel is not reachable', async () => {
    // The definition is a fact about the word, not about which board is in
    // scope — so it is on the inert-prose header too.
    mount(
      <LaneHeaderAffordance laneId="lane-1" laneName="Front stage" />,
      false,
    )
    const block = document.querySelector(
      '[data-blueprint-row-header]',
    ) as HTMLElement
    fireEvent.pointerEnter(block, { pointerType: 'mouse' })
    await waitFor(
      () => expect(screen.queryByText(laneDefinition)).not.toBeNull(),
      HOVER_BUDGET,
    )
  })
})

/* --------------------------------------------- the touch ⓘ, and only it */

describe('the touch info affordance reveals the definition without opening the panel', () => {
  it('exists on the lane header as a single control that asks what a lane is', () => {
    mount(<LaneHeaderAffordance laneId="lane-1" laneName="Front stage" />)
    const info = infoButton()
    expect(info).not.toBeNull()
    // Its accessible name is the question it answers, so a screen reader gets
    // the point of the control rather than a lone glyph.
    expect(info?.getAttribute('aria-label')).toMatch(/lane/i)
    // One, not one-per-word: the resting board is not to sprout a mark beside
    // every name.
    expect(
      document.querySelectorAll('[data-canvas-header-info]'),
    ).toHaveLength(1)
  })

  it('reveals the lane definition when tapped', async () => {
    mount(<LaneHeaderAffordance laneId="lane-1" laneName="Front stage" />)
    fireEvent.click(infoButton()!)
    await waitFor(
      () => expect(screen.queryByText(laneDefinition)).not.toBeNull(),
      HOVER_BUDGET,
    )
  })

  it('does not open the panel when the ⓘ is tapped', () => {
    mount(<LaneHeaderAffordance laneId="lane-1" laneName="Front stage" />)
    fireEvent.click(infoButton()!)
    // The tap is the definition's, never the panel's — otherwise a touch
    // reader could never read a definition without also opening the panel.
    expect(lanePressed()).toBe('false')
  })

  it('reveals the step definition when its ⓘ is tapped, panel still shut', async () => {
    mount(<StepHeaderAffordance stepId="step-1" name="Warm-Up" />)
    fireEvent.click(infoButton()!)
    await waitFor(
      () => expect(screen.queryByText(stepDefinition)).not.toBeNull(),
      HOVER_BUDGET,
    )
    expect(stepPressed()).toBe('false')
  })
})
