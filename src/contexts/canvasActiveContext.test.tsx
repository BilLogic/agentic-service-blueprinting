// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CanvasActiveProvider,
  useCanvasActiveEffect,
} from '@/contexts/canvasActiveContext'

afterEach(cleanup)

/**
 * Records when the gated effect runs and cleans up.
 */
function Probe({ log }: { log: string[] }) {
  useCanvasActiveEffect(() => {
    log.push('run')
    return () => {
      log.push('cleanup')
    }
  }, [])
  return null
}

describe('useCanvasActiveEffect', () => {
  it('does not run on a hidden warm canvas', () => {
    const log: string[] = []
    render(
      <CanvasActiveProvider active={false}>
        <Probe log={log} />
      </CanvasActiveProvider>,
    )
    expect(log).toEqual([])
  })

  it('runs while current and cleans up when hidden', () => {
    const log: string[] = []
    const view = render(
      <CanvasActiveProvider active>
        <Probe log={log} />
      </CanvasActiveProvider>,
    )
    expect(log).toEqual(['run'])
    view.rerender(
      <CanvasActiveProvider active={false}>
        <Probe log={log} />
      </CanvasActiveProvider>,
    )
    expect(log).toEqual(['run', 'cleanup'])
  })
})
