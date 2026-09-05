// @vitest-environment jsdom
/**
 * A panel does not open into a shell that is still booting (#265).
 *
 * The bug: a deep link to a cell opened the cell detail panel before the
 * sidebar, the identity bar and the canvas had painted — sometimes the first
 * thing on screen was an inspector over a 'Loading blueprints…' notice.
 * Every panel opens through `PanelDrawerShell`, so the drawer is the one
 * place to hold: gated here, the cell panel and the entity panel both wait,
 * and `panelState` stays the single owner of whether a panel is open.
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PanelDrawerShell } from '@/components/blueprint/panelShell'
import { setShellBooting } from '@/contexts/shellBootStore'

const CONTENT = 'Step 1 · Sign in'

beforeEach(() => {
  // jsdom has no `matchMedia`; the desktop posture is all this file needs.
  window.matchMedia = ((query: string) => ({
    media: query,
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
})

afterEach(() => {
  cleanup()
  setShellBooting(false)
})

function mount() {
  return render(
    <PanelDrawerShell open onCloseRequest={() => {}} onClosed={() => {}}>
      <p>{CONTENT}</p>
    </PanelDrawerShell>,
  )
}

describe('a panel drawer, against the shell boot lane', () => {
  it('stays shut while the shell boots, and opens when it lifts', async () => {
    setShellBooting(true)
    mount()
    expect(screen.queryByText(CONTENT)).toBeNull()

    act(() => setShellBooting(false))
    expect(await screen.findByText(CONTENT)).toBeTruthy()
  })

  it('opens straight away when the shell is already up', async () => {
    mount()
    expect(await screen.findByText(CONTENT)).toBeTruthy()
  })
})
