// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { currentCanvasElement } from '@/lib/canvasCellQuery'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('currentCanvasElement', () => {
  it('skips a canvas sitting under inert (a hidden warm view)', () => {
    const hiddenHost = document.createElement('div')
    hiddenHost.setAttribute('inert', '')
    const hiddenRoot = document.createElement('div')
    hiddenRoot.setAttribute('data-zoom-pan-root', '')
    hiddenHost.append(hiddenRoot)
    const visibleRoot = document.createElement('div')
    visibleRoot.setAttribute('data-zoom-pan-root', '')
    document.body.append(hiddenHost, visibleRoot)
    expect(currentCanvasElement('[data-zoom-pan-root]')).toBe(visibleRoot)
  })
})
