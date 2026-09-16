// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The remembered sheet height, read and written through the namespace seam.
 *
 * It was the one live key built as a bare literal, which is invisible from
 * inside the module: `'slide-sheet-height'` reads and writes itself perfectly
 * well. What it cannot do is differ per installation, so two installations on
 * one origin resized each other's sheet. The assertions below are therefore
 * about the KEY rather than about the height — a height round-tripping proves
 * nothing about whose height it is.
 *
 * Every case reloads the module graph and imports dynamically, because the
 * key is built while the module evaluates and the height is read then too.
 */
beforeEach(() => {
  vi.resetModules()
  window.localStorage.clear()
})

describe('the remembered slide-sheet height', () => {
  it('is read from this installation’s namespace', async () => {
    const { storageKey } = await import('@/lib/storageNamespace')
    window.localStorage.setItem(storageKey('slide-sheet-height'), '300')

    const { getSlideSheetHeight } = await import('@/lib/slideSheetHeight')
    expect(getSlideSheetHeight()).toBe(300)
  })

  it('is written to it, and to no key an installation cannot move', async () => {
    const { storageKey } = await import('@/lib/storageNamespace')
    const { persistSlideSheetHeight, setSlideSheetHeight } = await import(
      '@/lib/slideSheetHeight'
    )

    setSlideSheetHeight(300)
    persistSlideSheetHeight()

    expect(window.localStorage.getItem(storageKey('slide-sheet-height'))).toBe(
      '300',
    )
    expect(window.localStorage.getItem('slide-sheet-height')).toBeNull()
  })

  /**
   * The seam's whole point, and the case a literal fails: a host names its own
   * namespace before the app's modules evaluate, and this one takes it without
   * mentioning a prefix.
   */
  it('takes the prefix a host configured before the module evaluated', async () => {
    const { configureStorageNamespace } = await import('@/lib/storageNamespace')
    configureStorageNamespace('acme-')
    window.localStorage.setItem('acme-slide-sheet-height', '260')

    const { getSlideSheetHeight, persistSlideSheetHeight, setSlideSheetHeight } =
      await import('@/lib/slideSheetHeight')
    expect(getSlideSheetHeight()).toBe(260)

    setSlideSheetHeight(320)
    persistSlideSheetHeight()
    expect(window.localStorage.getItem('acme-slide-sheet-height')).toBe('320')
    expect(window.localStorage.getItem('sb-slide-sheet-height')).toBeNull()
  })
})
