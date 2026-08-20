import { describe, expect, it } from 'vitest'
import {
  SEMANTIC_ZOOM_THRESHOLD,
  tierZoomForTravel,
} from '@/hooks/useZoomPanViewport'

/** The tier a given zoom renders: below the threshold, cells are blocks. */
const tier = (zoom: number) =>
  zoom < SEMANTIC_ZOOM_THRESHOLD ? 'blocks' : 'text'

/*
 * A camera in motion decides its semantic tier ONCE, for the whole
 * journey, and both directions decide it the same way.
 *
 * Reading the destination alone satisfied the first half and broke the
 * second: zooming in stamped the expensive tier on frame one and then
 * rasterized full text at a scale that changed every frame for the length
 * of the ease, while zooming out dropped the detail before the camera had
 * moved at all. Same threshold, same duration, two animations that did not
 * feel like each other.
 */
describe('semantic tier while the camera is travelling', () => {
  const overview = 0.05
  const phase = 0.18
  const scenario = 0.45
  const deep = 0.8

  it('renders the cheap tier whenever a move crosses the threshold', () => {
    // in: the board would otherwise draw text through the entire glide
    expect(tier(tierZoomForTravel(phase, scenario))).toBe('blocks')
    // out: unchanged in appearance, but now for a stated reason
    expect(tier(tierZoomForTravel(scenario, phase))).toBe('blocks')
  })

  it('is symmetric — direction cannot change what gets drawn in flight', () => {
    for (const [a, b] of [
      [overview, scenario],
      [phase, deep],
      [overview, deep],
    ]) {
      expect(tierZoomForTravel(a, b)).toBe(tierZoomForTravel(b, a))
    }
  })

  it('leaves a move that never crosses exactly as it was', () => {
    // The case that already felt right: overview → phase, both below the
    // threshold. A regression here would be the fix breaking the thing it
    // was meant to leave alone.
    expect(tier(tierZoomForTravel(overview, phase))).toBe('blocks')
    expect(tier(overview)).toBe('blocks')
    expect(tier(phase)).toBe('blocks')

    // And a move entirely inside the text tier must never flash blocks.
    expect(tier(tierZoomForTravel(scenario, deep))).toBe('text')
    expect(tier(tierZoomForTravel(deep, scenario))).toBe('text')
  })

  it('lets the destination tier land when the camera stops', () => {
    // In flight the pair is cheap; on arrival the tier is the destination's
    // own zoom, which is what the animation's final commit passes.
    expect(tier(tierZoomForTravel(phase, scenario))).toBe('blocks')
    expect(tier(scenario)).toBe('text')
  })
})
