import { describe, expect, it } from 'vitest'
import { sourceOf } from '@/lib/sourceTree'

/**
 * Phone first-load: the cover is the landing view, the drawer stays closed,
 * and the CTA uses the scenario-navigation seam.
 */
describe('the phone opens on the cover', () => {
  it('the shell starts the drawer closed and mounts the cover on landing', () => {
    const shell = sourceOf('components/mobile/MobileShell.tsx')
    expect(shell).toMatch(/const \[navOpen, setNavOpen\] = useState\(false\)/)
    expect(shell).toContain("view === 'landing'")
    expect(shell).toContain('<CoverPage content={cover} />')
    expect(shell).not.toMatch(
      /selectedScenarioId === null &&\s*selectedPhaseId === null/,
    )
  })

  it('the cover CTA on a phone calls openScenario with the drawer closed', () => {
    const cover = sourceOf('components/cover/CoverPage.tsx')
    expect(cover).toContain('coverCanvasAction')
    expect(cover).toContain('openScenario')
    const action = sourceOf('lib/coverOpenAction.ts')
    expect(action).toContain('closeNav: true')
  })
})
