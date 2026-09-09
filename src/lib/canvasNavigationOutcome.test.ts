import { describe, expect, it } from 'vitest'
import {
  publishCanvasNavigationOutcome,
  waitForCanvasNavigationOutcome,
} from '@/lib/canvasNavigationOutcome'

describe('canvas navigation outcomes', () => {
  it('resolves only the matching semantic destination', async () => {
    const observed = waitForCanvasNavigationOutcome('scenario-a')
    publishCanvasNavigationOutcome('scenario-b', {
      kind: 'completed',
      transform: { pan: { x: 0, y: 0 }, zoom: 1 },
    })
    publishCanvasNavigationOutcome('scenario-a', {
      kind: 'superseded',
      transform: { pan: { x: 12, y: 4 }, zoom: 0.8 },
    })

    await expect(observed.promise).resolves.toMatchObject({
      kind: 'superseded',
    })
  })
})
