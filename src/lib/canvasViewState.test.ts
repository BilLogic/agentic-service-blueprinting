import { describe, expect, it } from 'vitest'
import {
  beginCanvasViewState,
  deleteCanvasViewStatesForTab,
  writeCanvasViewState,
} from '@/lib/canvasViewState'

const snapshot = (x: number) => ({
  transform: { pan: { x, y: -25 }, zoom: 0.8 },
  destinationKey: 'scenario:one',
  geometry: { left: 10, top: 20, width: 800, height: 500 },
})

describe('session canvas view state', () => {
  it('restores an isolated snapshot for the same mount generation', () => {
    const first = beginCanvasViewState('desktop:slice:one')
    const value = snapshot(40)
    writeCanvasViewState(first.lease, value)
    value.transform.pan.x = 999

    expect(beginCanvasViewState('desktop:slice:one').snapshot).toEqual(
      snapshot(40),
    )
  })

  it('rejects stale cleanup even when a replacement mount starts first', () => {
    const oldMount = beginCanvasViewState('desktop:slice:closed')
    writeCanvasViewState(oldMount.lease, snapshot(10))
    deleteCanvasViewStatesForTab('slice:closed')

    const replacement = beginCanvasViewState('desktop:slice:closed')
    expect(replacement.snapshot).toBeUndefined()
    writeCanvasViewState(oldMount.lease, snapshot(500))
    expect(beginCanvasViewState('desktop:slice:closed').snapshot).toBeUndefined()

    writeCanvasViewState(replacement.lease, snapshot(30))
    expect(beginCanvasViewState('desktop:slice:closed').snapshot).toEqual(
      snapshot(30),
    )
  })
})
