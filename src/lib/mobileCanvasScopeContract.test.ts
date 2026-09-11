import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/*
 * The mobile canvas draws one scenario, and navigates nowhere.
 *
 * A phone has no phase lane and no canvas navigation — the drawer is the
 * only way to move — so a sibling scenario on the board is a destination the
 * shell cannot take you to, drawn at a size the device pays for. A phase row
 * is several full boards.
 *
 * Two separate statements, and both are needed. Scoping the canvas says what
 * is currently RENDERED; withholding the handler says what a tap MEANS, and
 * it is the one that survives someone widening the scope later.
 *
 * The second statement is made ONCE, by the view that owns the canvas, and
 * travels down as a prop — so this holds the prop rather than a viewport
 * check inside the phase frame. That is what lets the same withholding cover
 * the phase frame, which is not a scenario and was never covered by scoping.
 *
 * Neither is observable in jsdom: the scope needs a real breakpoint and the
 * inertness needs a rendered board, so both are held to the source.
 */

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

const MOBILE_SHELL = read('../components/mobile/MobileShell.tsx')
const OVERVIEW_VIEW = read('../components/editor/ServiceOverviewView.tsx')
const PHASE_OVERVIEW = read(
  '../components/blueprint/PhaseScenarioOverview.tsx',
)

describe('mobile canvas scope', () => {
  it('draws one scenario, not one phase row', () => {
    // The id reaches the canvas through the scenario transition, which holds
    // the outgoing scenario for the length of a fade. Still exactly one
    // scenario id — what this pins is the singular, not the variable's name.
    expect(MOBILE_SHELL).toContain(
      'soloScenarioId={displayedScenarioId ?? undefined}',
    )
    expect(MOBILE_SHELL).toContain(
      '<MobileScenarioTransition scenarioId={soloScenarioId}>',
    )
  })

  it('resolves a phase-only selection to that phase’s first scenario', () => {
    // Otherwise a phase tapped in the drawer falls back to the whole row —
    // the case the scope exists to prevent.
    expect(MOBILE_SHELL).toContain(
      'return scenariosByPhase.get(selectedPhaseId)?.[0]?.id ?? null',
    )
  })
})

describe('mobile canvas navigation', () => {
  it('decides at the view that owns the canvas, once', () => {
    /*
      ONE gate, and it is here rather than inside the phase frame. The frame
      and the scenario panels inside it used to answer the same question in
      two places, and only one of the two covered the frame — which is a
      navigation target in its own right and is NOT a scenario, so scoping
      the canvas to one scenario never covered it.
    */
    expect(OVERVIEW_VIEW).toContain(
      'const canvasNavigate = mobileShell ? undefined : openCanvasDetail',
    )
    expect(OVERVIEW_VIEW).toContain('onOpenPhase={canvasNavigate}')
    expect(OVERVIEW_VIEW).toContain('openScenario={canvasNavigate}')
  })

  it('leaves the phase frame with no opener of its own', () => {
    // Withheld, not defaulted: an `?? openDetail` anywhere below the gate
    // would put navigation back on the phone without touching the gate.
    expect(PHASE_OVERVIEW).not.toContain('useMobileShell')
    expect(PHASE_OVERVIEW).toContain('openDetail?: (scenarioId: string) => void')
    // One stable handler per scenario, and none at all without an opener.
    expect(PHASE_OVERVIEW).toContain('if (!openDetail) return handlers')
    expect(PHASE_OVERVIEW).toContain(
      'onNavigate={navigateByScenario.get(scenario.id)}',
    )
    expect(OVERVIEW_VIEW).toContain(
      'onNavigate={onOpenPhase ? () => onOpenPhase(phase.id) : undefined}',
    )
  })

  it('leaves the surfaces inert rather than dead buttons', () => {
    /*
      `navigable` is gated on the handler existing, so a mobile panel gets no
      `role="button"`, no pointer cursor and no aria-label promising a
      destination — instead of a button that swallows taps.
    */
    const panel = read('../components/blueprint/ResizableComparePanel.tsx')
    const section = read('../components/editor/CanvasPhaseSection.tsx')
    for (const source of [panel, section]) {
      expect(source).toContain('const interactive = Boolean(onNavigate)')
      expect(source).toContain('const navigable = interactive && !focusActive')
    }
  })

  it('keeps the panel’s fill and the phase badge off the handler', () => {
    /*
      The regression this pair guards: `data-phase-scenario-panel` carries
      the panel's fill, its border and its beat in the canvas reveal, and the
      badge tone says "phase". Gating either on `onNavigate` renders an
      unfilled panel under a mistyped badge the moment navigation is
      withheld — which is exactly what the mobile canvas does.
    */
    const panel = read('../components/blueprint/ResizableComparePanel.tsx')
    const section = read('../components/editor/CanvasPhaseSection.tsx')
    expect(panel).toContain('data-phase-scenario-panel=""')
    expect(panel).not.toContain(
      "interactive ? { 'data-phase-scenario-panel': '' }",
    )
    expect(section).toContain('tone="phase"')
  })
})
