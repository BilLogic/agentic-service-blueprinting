import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/*
 * The canvas owns every gesture inside the board.
 *
 * `touch-action` is NOT inherited, and the board hangs inside
 * `[data-zoom-pan-content]`, which carries a transform and is therefore a
 * composited layer. WebKit does not reliably resolve an ancestor's `none`
 * across that boundary — so with the rule set on the viewport alone, a
 * finger on a cell was taken as a native pan/zoom, which cancels the pointer
 * stream the canvas listens to. Panning and pinching worked on empty canvas
 * and did nothing at all inside a path board.
 *
 * Chromium walks the ancestor chain correctly, so no amount of checking in a
 * Chromium browser pane can catch a regression here. That is exactly why
 * this is pinned in a test instead: the rule looks redundant to anyone
 * reading the stylesheet in a browser where it is.
 */

const CSS = readFileSync(
  fileURLToPath(new URL('../styles/blueprint.css', import.meta.url)),
  'utf8',
)

const VIEWPORT_TSX = readFileSync(
  fileURLToPath(
    new URL('../components/editor/ZoomPanViewport.tsx', import.meta.url),
  ),
  'utf8',
)

describe('canvas touch contract', () => {
  it('kills native touch handling on the whole board subtree, not just the viewport', () => {
    const rule = CSS.replace(/\s+/g, ' ')
    expect(rule).toContain(
      '[data-zoom-pan-content], [data-zoom-pan-content] * { touch-action: none; }',
    )
  })

  it('also sets it on the transformed content wrapper itself', () => {
    // The composited element is the one WebKit stops looking past, so it
    // carries the rule directly as well as through the stylesheet.
    const contentDiv = VIEWPORT_TSX.slice(
      VIEWPORT_TSX.indexOf('data-zoom-pan-content') - 800,
      VIEWPORT_TSX.indexOf('data-zoom-pan-content'),
    )
    expect(contentDiv).toContain('touch-none')
  })

  it('still suppresses WebKit’s text gestures on the viewport', () => {
    // The selection drag and the long-press callout are a separate stream
    // steal from the one above; both have to stay dead.
    expect(CSS).toContain('-webkit-touch-callout: none')
    expect(CSS).toContain('-webkit-user-select: none')
  })
})
