// @vitest-environment jsdom
/**
 * The canvas owns every gesture inside the board — asserted by dispatching
 * gestures at it.
 *
 * This file used to read `useZoomPanViewport.ts` as text and check that
 * certain character sequences appeared in it. Three of those sequences were
 * `const options = …`, and the hook declared `options` three times with three
 * different values — `{capture:true}`, `{passive:false,capture:true}` and
 * `{passive:false}`. `toContain` cannot say which declaration it matched, so
 * moving two of them past each other kept the test green while the touch
 * listener went passive, and a passive `preventDefault` is a no-op with a
 * console warning. Green would have meant nothing.
 *
 * jsdom implements the passive flag, so the difference is visible from
 * outside: dispatch a `touchmove` and ask whether it was prevented. Every
 * assertion below is of that shape.
 *
 * The three declarations were also given distinct names, so the hazard is
 * gone at the source as well as in the test.
 *
 * What is NOT asserted here, and why: the CSS half. `touch-action` is
 * consulted by the compositor, jsdom has no compositor and no cascade for the
 * property, and the failure this estate actually hit was a build-time one — a
 * renamed at-rule silently dropped, so the source read correctly and the
 * served stylesheet computed `auto`. A unit test reading either the source or
 * the DOM would have passed through that. The two source assertions at the
 * bottom are kept deliberately narrow and carry their own failure messages
 * saying what to check in a browser, because narrow-and-loud is the most an
 * assertion at this altitude can be.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { useZoomPanViewport } from '@/hooks/useZoomPanViewport'

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  // jsdom has no pointer capture at all; the hook treats it as an assist, so
  // a recording stub is enough to see whether the stream was observed.
  Element.prototype.setPointerCapture = function setPointerCapture() {}
  Element.prototype.releasePointerCapture = function releasePointerCapture() {}
})

afterEach(cleanup)

/**
 * The board's real shape: a viewport, a transformed content wrapper, an
 * overflowing grid a few levels in, and a cell inside it. jsdom has no
 * layout, so the three numbers `findScrollableRegions` reads are stamped on
 * by hand — the same trick `canvasScrollRegions.test.ts` uses.
 */
function Harness({ mounted = true }: { mounted?: boolean }) {
  const { containerRef, contentRef } = useZoomPanViewport({})
  if (!mounted) return null
  return (
    <div ref={containerRef} data-testid="viewport">
      <div ref={contentRef}>
        <div data-testid="grid" style={{ overflowY: 'auto' }}>
          <button data-testid="cell">cell</button>
        </div>
        <div data-testid="plain">plain canvas</div>
      </div>
    </div>
  )
}

function stampOverflow(element: HTMLElement) {
  for (const [key, value] of Object.entries({
    clientHeight: 400,
    scrollHeight: 1200,
    clientWidth: 600,
    scrollWidth: 600,
    scrollTop: 0,
    scrollLeft: 0,
  })) {
    Object.defineProperty(element, key, { value, writable: true })
  }
}

function mountBoard(options?: { mounted?: boolean }) {
  const view = render(<Harness mounted={options?.mounted ?? true} />)
  const at = (testId: string) =>
    document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)
  const grid = at('grid')
  if (grid) stampOverflow(grid)
  return { view, at }
}

/**
 * jsdom has no `Touch`, and the listeners read only how many there are — so
 * the count is the whole payload.
 */
function touch(type: 'touchstart' | 'touchmove', fingers: number): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', {
    value: Array.from({ length: fingers }, () => ({})),
  })
  return event
}

function pointerDown(element: HTMLElement, init?: PointerEventInit): Event {
  const event = new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    button: 0,
    isPrimary: true,
    pointerId: 1,
    ...init,
  })
  element.dispatchEvent(event)
  return event
}

describe('the canvas claims the gesture, rather than declaring it', () => {
  it('prevents a two-finger move anywhere on the board', () => {
    const { at } = mountBoard()
    const event = touch('touchmove', 2)
    at('cell')!.dispatchEvent(event)
    expect(
      event.defaultPrevented,
      'a pinch inside the board must be the canvas’s, or WebKit zooms the page',
    ).toBe(true)
  })

  it('prevents a one-finger move over plain canvas', () => {
    const { at } = mountBoard()
    const event = touch('touchmove', 1)
    at('plain')!.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('leaves a one-finger move inside an overflowing region alone', () => {
    // The defect the touch path carried: the wheel handed its delta to this
    // grid while touch prevented every move in the same subtree, so clipped
    // rows were reachable with a trackpad and unreachable with a finger.
    const { at } = mountBoard()
    const event = touch('touchmove', 1)
    at('cell')!.dispatchEvent(event)
    expect(
      event.defaultPrevented,
      'a finger over a scrolling grid belongs to the grid',
    ).toBe(false)
  })

  it('still claims two fingers inside a scrollable region', () => {
    const { at } = mountBoard()
    const event = touch('touchmove', 2)
    at('cell')!.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('leaves the first finger’s touchstart alone, so a tap still clicks', () => {
    const { at } = mountBoard()
    const event = touch('touchstart', 1)
    at('cell')!.dispatchEvent(event)
    expect(
      event.defaultPrevented,
      'preventing the first touchstart suppresses the click a tap depends on',
    ).toBe(false)
  })

  it('claims the second finger’s touchstart, where page pinch-zoom starts', () => {
    const { at } = mountBoard()
    const event = touch('touchstart', 2)
    at('cell')!.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('does nothing to a touch outside the board', () => {
    mountBoard()
    const outside = document.createElement('div')
    document.body.append(outside)
    const event = touch('touchmove', 2)
    outside.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})

describe('pointer streams are observed in native capture', () => {
  it('sees a pointerdown a descendant stops', () => {
    const { at } = mountBoard()
    const captured: number[] = []
    const viewport = at('viewport')!
    viewport.setPointerCapture = (id: number) => {
      captured.push(id)
    }
    const plain = at('plain')!
    plain.addEventListener('pointerdown', (event) => event.stopPropagation())

    pointerDown(plain, { pointerType: 'mouse', pointerId: 7 })

    expect(
      captured,
      'the viewport listens in native capture precisely so a lane or cell cannot hide this',
    ).toEqual([7])
  })
})

describe('a container that mounts late', () => {
  it('still gets its listeners', () => {
    // The hook's own comment names this failure: an effect that reads the ref
    // once attaches nothing if it runs before the node exists, and with
    // stable deps it is never retried. The wheel and gesture listeners escape
    // it by living on window; the three element-scoped effects escape it by
    // depending on the node.
    const view = render(<Harness mounted={false} />)
    expect(document.querySelector('[data-testid="viewport"]')).toBeNull()

    view.rerender(<Harness mounted />)
    const cell = document.querySelector<HTMLElement>('[data-testid="cell"]')!
    const event = touch('touchmove', 2)
    cell.dispatchEvent(event)

    expect(
      event.defaultPrevented,
      'the touch claim never attached to a container that appeared after the first effect pass',
    ).toBe(true)
  })
})

/**
 * The CSS half, which no assertion in this process can exercise.
 *
 * `touch-action` is NOT inherited, and the board hangs inside
 * `[data-zoom-pan-content]`, which carries a transform and is therefore a
 * composited lane. WebKit does not reliably resolve an ancestor's `none`
 * across that boundary, so with the rule set on the viewport alone a finger
 * on a cell was taken as a native pan/zoom, which cancels the pointer stream
 * everything above depends on. Chromium walks the chain correctly, so no
 * amount of checking in a Chromium pane can catch a regression here either.
 */
const CSS = readFileSync(join(process.cwd(), 'src/styles/blueprint.css'), 'utf8')

describe('the CSS declaration, which only a browser can verify', () => {
  it('kills native touch handling on the whole board subtree', () => {
    expect(
      CSS.replace(/\s+/g, ' '),
      'this rule is the compositor’s copy of the claim above; if it is gone, verify getComputedStyle(cell).touchAction in Safari before believing any green test',
    ).toContain(
      '[data-zoom-pan-content], [data-zoom-pan-content] * { touch-action: none; }',
    )
  })

  it('suppresses WebKit’s text gestures on the viewport', () => {
    // The selection drag and the long-press callout are a separate stream
    // steal from the one above; both have to stay dead.
    expect(CSS, 'long-press callout returns without this').toContain(
      '-webkit-touch-callout: none',
    )
    expect(CSS, 'selection drag steals the stream without this').toContain(
      '-webkit-user-select: none',
    )
  })
})
