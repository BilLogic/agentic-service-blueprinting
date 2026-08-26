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
    expect(MOBILE_SHELL).toContain(
      'soloScenarioId={soloScenarioId ?? undefined}',
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
  it('passes no navigate handler for a scenario panel', () => {
    expect(PHASE_OVERVIEW).toContain('const canvasNavigates = !useMobileShell()')
    expect(PHASE_OVERVIEW).toContain(
      'canvasNavigates ? () => openDetail(scenario.id) : undefined',
    )
  })

  it('passes no navigate handler for the phase frame either', () => {
    /*
      The phase frame is a navigation target in its own right and it is NOT a
      scenario, so scoping the canvas to one scenario does not cover it.
    */
    expect(OVERVIEW_VIEW).toContain(
      'onOpenPhase={mobileShell ? undefined : openDetail}',
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
